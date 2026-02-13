const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Helper: calculate progress for a client
function calculateProgress(client) {
  const newRelease = db.prepare("SELECT SettingValue FROM AdminSettings WHERE SettingName = 'NewSoftwareRelease'").get();
  const isNewRelease = newRelease && newRelease.SettingValue === '1';

  const baseItems = [
    'ConfirmContactInfo', 'ReviewRequirements', 'ScheduleAppointment',
    'DownloadSoftware', 'InformClient', 'StartInstallation',
    'EnterUserID', 'ConfigureSettings', 'ManageUserAccounts',
    'RunSoftware', 'ProvideWalkthrough', 'DemonstrateTasks',
    'ContactSupport', 'OfferResources', 'ProvideTrainingInfo', 'ScheduleFollowUp',
  ];

  const conversionItems = ['VerifyPlanData', 'ExecuteConversion', 'VerifyIntegrity', 'TransferSetupData'];
  const items = [...baseItems];

  if (client.ConversionNeeded) {
    items.push(...conversionItems);
  }
  if (client.BankEnrollment) {
    items.push('CompleteBankEnrollment');
  }
  if (isNewRelease) {
    items.push('InstalledNewVersion');
  }

  const completed = items.filter(item => client[item] === 1).length;
  return Math.round((completed / items.length) * 100);
}

// Helper: log history
function logHistory(clientId, actionType, actionDetails, userId) {
  db.prepare(
    'INSERT INTO OnboardingHistory (ClientID, ActionType, ActionDetails, EditedBy) VALUES (?, ?, ?, ?)'
  ).run(clientId, actionType, actionDetails, userId);
}

// GET /api/clients - List all clients (filtered by role)
router.get('/', authenticate, (req, res) => {
  let clients;
  if (req.user.role === 'tech') {
    clients = db.prepare(`
      SELECT o.*, u1.FirstName || ' ' || u1.LastName AS TechName,
             u2.FirstName || ' ' || u2.LastName AS SalesRepName
      FROM Onboarding o
      LEFT JOIN Users u1 ON o.AssignedTech = u1.UserID
      LEFT JOIN Users u2 ON o.SalesRep = u2.UserID
      WHERE o.AssignedTech = ?
      ORDER BY o.DateAdded DESC
    `).all(req.user.userId);
  } else {
    clients = db.prepare(`
      SELECT o.*, u1.FirstName || ' ' || u1.LastName AS TechName,
             u2.FirstName || ' ' || u2.LastName AS SalesRepName
      FROM Onboarding o
      LEFT JOIN Users u1 ON o.AssignedTech = u1.UserID
      LEFT JOIN Users u2 ON o.SalesRep = u2.UserID
      ORDER BY o.DateAdded DESC
    `).all();
  }
  res.json(clients);
});

// GET /api/clients/:id - Get single client with details and programs
router.get('/:id', authenticate, (req, res) => {
  const client = db.prepare(`
    SELECT o.*, u1.FirstName || ' ' || u1.LastName AS TechName,
           u2.FirstName || ' ' || u2.LastName AS SalesRepName
    FROM Onboarding o
    LEFT JOIN Users u1 ON o.AssignedTech = u1.UserID
    LEFT JOIN Users u2 ON o.SalesRep = u2.UserID
    WHERE o.ClientID = ?
  `).get(req.params.id);

  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const details = db.prepare('SELECT * FROM OnboardingDetails WHERE ClientID = ?').get(req.params.id);
  const programs = db.prepare('SELECT * FROM EntitledPrograms WHERE ClientID = ?').get(req.params.id);

  res.json({ ...client, details: details || null, programs: programs || null });
});

// POST /api/clients - Add new client
router.post('/', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const {
    clientId, clientName, dateAdded, assignedTech, salesRep,
    email, phoneNumber, previousSoftware, conversionNeeded,
    spanish, bankEnrollment, package: pkg, readyToCall, notes,
    customPrograms,
  } = req.body;

  if (!clientId || !clientName) {
    return res.status(400).json({ error: 'Client ID and Name are required' });
  }

  const existing = db.prepare('SELECT ClientID FROM Onboarding WHERE ClientID = ?').get(clientId);
  if (existing) {
    return res.status(409).json({ error: 'Client ID already exists' });
  }

  // Determine assigned tech via round-robin if not specified
  let techId = assignedTech || null;
  if (!techId) {
    const techs = db.prepare("SELECT UserID FROM Users WHERE Role = 'tech' OR Department = 2 ORDER BY UserID").all();
    if (techs.length > 0) {
      const last = db.prepare('SELECT UserID FROM LastAssignedTech ORDER BY id DESC LIMIT 1').get();
      const lastIdx = last ? techs.findIndex(t => t.UserID === last.UserID) : -1;
      const nextIdx = (lastIdx + 1) % techs.length;
      techId = techs[nextIdx].UserID;
      db.prepare('INSERT INTO LastAssignedTech (UserID) VALUES (?)').run(techId);
    }
  }

  const uploadToken = uuidv4();

  const insertClient = db.prepare(`
    INSERT INTO Onboarding (
      ClientID, ClientName, DateAdded, AssignedTech, SalesRep,
      Email, PhoneNumber, PreviousSoftware, ConversionNeeded,
      Spanish, BankEnrollment, Package, ReadyToCall, UploadToken, Progress
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const insertDetails = db.prepare(`
    INSERT INTO OnboardingDetails (ClientID, Notes) VALUES (?, ?)
  `);

  // Determine programs based on package
  let programs = {};
  const allProgs = ['prog_1040','prog_Depreciation','prog_Proforma','prog_1120','prog_1120S','prog_1065','prog_1041','prog_706Estate','prog_709Gift','prog_990Exempt','prog_DocArk','prog_1099Acc'];
  const individualProgs = ['prog_1040','prog_Depreciation','prog_Proforma'];
  const businessProgs = [...individualProgs, 'prog_1120','prog_1120S','prog_1065','prog_1041'];

  if (pkg === 'Professional') {
    allProgs.forEach(p => programs[p] = 1);
  } else if (pkg === 'Business') {
    allProgs.forEach(p => programs[p] = businessProgs.includes(p) ? 1 : 0);
  } else if (pkg === 'Custom' && customPrograms) {
    allProgs.forEach(p => programs[p] = customPrograms.includes(p) ? 1 : 0);
  } else {
    // Individual (default)
    allProgs.forEach(p => programs[p] = individualProgs.includes(p) ? 1 : 0);
  }

  const insertPrograms = db.prepare(`
    INSERT INTO EntitledPrograms (ClientID, prog_1040, prog_Depreciation, prog_Proforma,
      prog_1120, prog_1120S, prog_1065, prog_1041, prog_706Estate, prog_709Gift,
      prog_990Exempt, prog_DocArk, prog_1099Acc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertClient.run(
      clientId, clientName, dateAdded || new Date().toISOString().split('T')[0],
      techId, salesRep || req.user.userId,
      email || '', phoneNumber || '', previousSoftware || '',
      conversionNeeded ? 1 : 0, spanish ? 1 : 0, bankEnrollment ? 1 : 0,
      pkg || 'Individual', readyToCall ? 1 : 0, uploadToken
    );

    insertDetails.run(clientId, notes || '');

    insertPrograms.run(
      clientId, programs.prog_1040, programs.prog_Depreciation, programs.prog_Proforma,
      programs.prog_1120, programs.prog_1120S, programs.prog_1065, programs.prog_1041,
      programs.prog_706Estate, programs.prog_709Gift, programs.prog_990Exempt,
      programs.prog_DocArk, programs.prog_1099Acc
    );

    if (techId) {
      db.prepare('INSERT INTO Notifications (ClientID, TechID, Message) VALUES (?, ?, ?)').run(
        clientId, techId, `New client "${clientName}" has been assigned to you.`
      );
    }

    logHistory(clientId, 'Client Added', `Client "${clientName}" added by ${req.user.username}`, req.user.userId);
  });

  try {
    transaction();
    res.status(201).json({ success: true, clientId, uploadToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const clientId = req.params.id;
  const existing = db.prepare('SELECT * FROM Onboarding WHERE ClientID = ?').get(clientId);
  if (!existing) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const {
    clientName, assignedTech, salesRep, email, phoneNumber,
    previousSoftware, conversionNeeded, spanish, bankEnrollment,
    package: pkg, readyToCall, stalled, cancelled, rowColor, newClientId,
  } = req.body;

  const changes = [];
  if (clientName !== undefined && clientName !== existing.ClientName) changes.push(`Name: ${existing.ClientName} → ${clientName}`);
  if (assignedTech !== undefined && assignedTech !== existing.AssignedTech) changes.push(`Tech reassigned`);
  if (stalled !== undefined && stalled !== existing.Stalled) changes.push(`Stalled: ${stalled}`);
  if (cancelled !== undefined && cancelled !== existing.Cancelled) changes.push(`Cancelled: ${cancelled}`);

  db.prepare(`
    UPDATE Onboarding SET
      ClientName = COALESCE(?, ClientName),
      AssignedTech = COALESCE(?, AssignedTech),
      SalesRep = COALESCE(?, SalesRep),
      Email = COALESCE(?, Email),
      PhoneNumber = COALESCE(?, PhoneNumber),
      PreviousSoftware = COALESCE(?, PreviousSoftware),
      ConversionNeeded = COALESCE(?, ConversionNeeded),
      Spanish = COALESCE(?, Spanish),
      BankEnrollment = COALESCE(?, BankEnrollment),
      Package = COALESCE(?, Package),
      ReadyToCall = COALESCE(?, ReadyToCall),
      Stalled = COALESCE(?, Stalled),
      Cancelled = COALESCE(?, Cancelled),
      RowColor = COALESCE(?, RowColor),
      UpdatedAt = datetime('now')
    WHERE ClientID = ?
  `).run(
    clientName ?? null, assignedTech ?? null, salesRep ?? null,
    email ?? null, phoneNumber ?? null, previousSoftware ?? null,
    conversionNeeded !== undefined ? (conversionNeeded ? 1 : 0) : null,
    spanish !== undefined ? (spanish ? 1 : 0) : null,
    bankEnrollment !== undefined ? (bankEnrollment ? 1 : 0) : null,
    pkg ?? null, readyToCall !== undefined ? (readyToCall ? 1 : 0) : null,
    stalled !== undefined ? (stalled ? 1 : 0) : null,
    cancelled !== undefined ? (cancelled ? 1 : 0) : null,
    rowColor ?? null,
    clientId
  );

  // Update programs if package changed
  if (pkg) {
    const allProgs = ['prog_1040','prog_Depreciation','prog_Proforma','prog_1120','prog_1120S','prog_1065','prog_1041','prog_706Estate','prog_709Gift','prog_990Exempt','prog_DocArk','prog_1099Acc'];
    const individualProgs = ['prog_1040','prog_Depreciation','prog_Proforma'];
    const businessProgs = [...individualProgs, 'prog_1120','prog_1120S','prog_1065','prog_1041'];
    let programs = {};

    if (pkg === 'Professional') {
      allProgs.forEach(p => programs[p] = 1);
    } else if (pkg === 'Business') {
      allProgs.forEach(p => programs[p] = businessProgs.includes(p) ? 1 : 0);
    } else if (pkg === 'Custom' && req.body.customPrograms) {
      allProgs.forEach(p => programs[p] = req.body.customPrograms.includes(p) ? 1 : 0);
    } else {
      allProgs.forEach(p => programs[p] = individualProgs.includes(p) ? 1 : 0);
    }

    db.prepare(`
      UPDATE EntitledPrograms SET
        prog_1040=?, prog_Depreciation=?, prog_Proforma=?, prog_1120=?, prog_1120S=?,
        prog_1065=?, prog_1041=?, prog_706Estate=?, prog_709Gift=?, prog_990Exempt=?,
        prog_DocArk=?, prog_1099Acc=?
      WHERE ClientID = ?
    `).run(
      programs.prog_1040, programs.prog_Depreciation, programs.prog_Proforma,
      programs.prog_1120, programs.prog_1120S, programs.prog_1065, programs.prog_1041,
      programs.prog_706Estate, programs.prog_709Gift, programs.prog_990Exempt,
      programs.prog_DocArk, programs.prog_1099Acc,
      clientId
    );
  }

  // Update ClientID if changed
  if (newClientId && newClientId !== clientId) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.prepare('UPDATE Onboarding SET ClientID = ? WHERE ClientID = ?').run(newClientId, clientId);
    db.prepare('UPDATE OnboardingDetails SET ClientID = ? WHERE ClientID = ?').run(newClientId, clientId);
    db.prepare('UPDATE EntitledPrograms SET ClientID = ? WHERE ClientID = ?').run(newClientId, clientId);
    db.prepare('UPDATE OnboardingHistory SET ClientID = ? WHERE ClientID = ?').run(newClientId, clientId);
    db.exec('PRAGMA foreign_keys = ON');
    changes.push(`ClientID: ${clientId} → ${newClientId}`);
  }

  if (changes.length > 0) {
    logHistory(newClientId || clientId, 'Client Updated', changes.join('; '), req.user.userId);
  }

  res.json({ success: true });
});

// PATCH /api/clients/:id/checklist - Update checklist item
router.patch('/:id/checklist', authenticate, (req, res) => {
  const { field, value } = req.body;
  const validFields = [
    'ConfirmContactInfo', 'ReviewRequirements', 'ScheduleAppointment',
    'DownloadSoftware', 'InformClient', 'StartInstallation',
    'EnterUserID', 'ConfigureSettings', 'ManageUserAccounts',
    'RunSoftware', 'ProvideWalkthrough', 'DemonstrateTasks',
    'VerifyPlanData', 'ExecuteConversion', 'VerifyIntegrity', 'TransferSetupData',
    'ContactSupport', 'OfferResources', 'ProvideTrainingInfo', 'ScheduleFollowUp',
    'InstalledNewVersion', 'CompleteBankEnrollment',
  ];

  if (!validFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid checklist field' });
  }

  const val = value ? 1 : 0;
  db.prepare(`UPDATE Onboarding SET ${field} = ?, UpdatedAt = datetime('now') WHERE ClientID = ?`).run(val, req.params.id);

  // Recalculate progress
  const client = db.prepare('SELECT * FROM Onboarding WHERE ClientID = ?').get(req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const progress = calculateProgress(client);

  // Update completion status
  let completed = 0;
  let completedUntilNewVersion = 0;
  const newRelease = db.prepare("SELECT SettingValue FROM AdminSettings WHERE SettingName = 'NewSoftwareRelease'").get();
  const isNewRelease = newRelease && newRelease.SettingValue === '1';

  if (progress === 100) {
    if (isNewRelease && !client.InstalledNewVersion) {
      completedUntilNewVersion = 1;
    } else {
      completed = 1;
    }
  }

  db.prepare(`
    UPDATE Onboarding SET Progress = ?, Completed = ?, CompletedUntilNewVersion = ?, UpdatedAt = datetime('now')
    WHERE ClientID = ?
  `).run(progress, completed, completedUntilNewVersion, req.params.id);

  logHistory(req.params.id, 'Checklist Updated', `${field} set to ${val}`, req.user.userId);

  res.json({ success: true, progress, completed, completedUntilNewVersion });
});

// PATCH /api/clients/:id/status - Update client status fields
router.patch('/:id/status', authenticate, (req, res) => {
  const { field, value } = req.body;
  const validFields = ['ReadyToCall', 'Stalled', 'Cancelled', 'RowColor'];

  if (!validFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid status field' });
  }

  if (field === 'RowColor') {
    db.prepare(`UPDATE Onboarding SET RowColor = ?, UpdatedAt = datetime('now') WHERE ClientID = ?`).run(value, req.params.id);
  } else {
    db.prepare(`UPDATE Onboarding SET ${field} = ?, UpdatedAt = datetime('now') WHERE ClientID = ?`).run(value ? 1 : 0, req.params.id);
  }

  logHistory(req.params.id, 'Status Updated', `${field} set to ${value}`, req.user.userId);
  res.json({ success: true });
});

// DELETE /api/clients - Bulk delete clients
router.delete('/', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const { clientIds } = req.body;
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ error: 'No client IDs provided' });
  }

  const deleteTransaction = db.transaction(() => {
    for (const id of clientIds) {
      db.prepare('DELETE FROM OnboardingDetails WHERE ClientID = ?').run(id);
      db.prepare('DELETE FROM EntitledPrograms WHERE ClientID = ?').run(id);
      db.prepare('DELETE FROM Notifications WHERE ClientID = ?').run(id);
      db.prepare('DELETE FROM OnboardingHistory WHERE ClientID = ?').run(id);
      db.prepare('DELETE FROM Onboarding WHERE ClientID = ?').run(id);
    }
  });

  try {
    deleteTransaction();
    res.json({ success: true, deleted: clientIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/clients/:id/details - Update client details (notes, callouts)
router.patch('/:id/details', authenticate, (req, res) => {
  const { notes, firstCallout, followUpCalls } = req.body;

  const existing = db.prepare('SELECT * FROM OnboardingDetails WHERE ClientID = ?').get(req.params.id);
  if (!existing) {
    db.prepare('INSERT INTO OnboardingDetails (ClientID, Notes, FirstCallout, FollowUpCalls) VALUES (?, ?, ?, ?)').run(
      req.params.id, notes || '', firstCallout || null, followUpCalls || null
    );
  } else {
    db.prepare(`
      UPDATE OnboardingDetails SET
        Notes = COALESCE(?, Notes),
        FirstCallout = COALESCE(?, FirstCallout),
        FollowUpCalls = COALESCE(?, FollowUpCalls)
      WHERE ClientID = ?
    `).run(notes ?? null, firstCallout ?? null, followUpCalls ?? null, req.params.id);
  }

  logHistory(req.params.id, 'Details Updated', 'Client details updated', req.user.userId);
  res.json({ success: true });
});

module.exports = router;
