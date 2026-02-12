import express from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { calculateProgress } from '../services/progress.js';

const PROGRAM_KEYS = [
  'prog_1040','prog_Depreciation','prog_Proforma','prog_1120','prog_1120S','prog_1065',
  'prog_1041','prog_706Estate','prog_709Gift','prog_990Exempt','prog_DocArk','prog_1099Acc'
];

const CHECKLIST_ITEMS = new Set([
  'ConfirmContactInfo', 'ReviewRequirements', 'ScheduleAppointment',
  'DownloadSoftware', 'InformClient', 'StartInstallation',
  'EnterUserID', 'ConfigureSettings', 'ManageUserAccounts', 'RunSoftware',
  'ProvideWalkthrough', 'DemonstrateTasks', 'ContactSupport', 'OfferResources',
  'ProvideTrainingInfo', 'ScheduleFollowUp', 'VerifyPlanData', 'ExecuteConversion',
  'VerifyIntegrity', 'TransferSetupData', 'CompleteBankEnrollment', 'InstalledNewVersion'
]);

const STATUS_FIELDS = new Set(['Cancelled', 'Stalled', 'Completed', 'CompletedUntilNewVersion', 'RowColor', 'ReadyToCall']);

const router = express.Router();
router.use(authRequired);

async function getSettings(db) {
  const rows = await db.all('SELECT Setting_Name, Setting_Value FROM admin_settings');
  return rows.reduce((acc, r) => ({ ...acc, [r.Setting_Name]: r.Setting_Value }), {});
}

router.get('/', async (req, res) => {
  const db = await getDb();
  let query = 'SELECT * FROM Onboarding';
  const params = [];
  if (req.user.department === 2 || req.user.role === 'tech') {
    query += ' WHERE AssignedTech = ?';
    params.push(req.user.userId);
  }
  query += ' ORDER BY DateAdded DESC';
  const clients = await db.all(query, ...params);
  res.json(clients);
});

router.post('/', async (req, res) => {
  if (!['admin', 'sales'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const db = await getDb();

  try {
    const {
      dateAdded, clientId, clientName, assignedTech, salesRep, email, phoneNumber, previousSoftware,
      conversionNeeded = 'No', spanish = 'No', bankEnrollment = 'No', packageName = '', readyToCall = 0,
      notes = '', entitledPrograms = {}
    } = req.body;

    const cleanClientId = String(clientId || '').trim();
    const cleanClientName = String(clientName || '').trim();
    const assignedTechId = assignedTech === '' || assignedTech == null ? null : Number(assignedTech);
    const salesRepId = salesRep === '' || salesRep == null ? null : Number(salesRep);

    if (!cleanClientId || !cleanClientName) {
      return res.status(400).json({ error: 'Client ID and Client Name are required.' });
    }

    if (assignedTechId != null) {
      const techExists = await db.get('SELECT UserID FROM Users WHERE UserID = ?', assignedTechId);
      if (!techExists) return res.status(400).json({ error: 'Assigned tech does not exist.' });
    }

    if (salesRepId != null) {
      const salesExists = await db.get('SELECT UserID FROM Users WHERE UserID = ?', salesRepId);
      if (!salesExists) return res.status(400).json({ error: 'Sales rep does not exist.' });
    }

    const token = crypto.randomBytes(16).toString('hex');

    await db.run(
      `INSERT INTO Onboarding (DateAdded, ClientID, ClientName, AssignedTech, SalesRep, Email, PhoneNumber, PreviousSoftware,
        ConvertionNeeded, Spanish, BankEnrollment, Package, ReadyToCall, UploadToken)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      dateAdded || new Date().toISOString().slice(0, 10),
      cleanClientId,
      cleanClientName,
      assignedTechId,
      salesRepId,
      email || null,
      phoneNumber || null,
      previousSoftware || null,
      conversionNeeded,
      spanish,
      bankEnrollment,
      packageName,
      readyToCall ? 1 : 0,
      token
    );

    const values = PROGRAM_KEYS.map((k) => (entitledPrograms[k] ? 1 : 0));
    await db.run(
      `INSERT INTO EntitledPrograms (ClientID, ${PROGRAM_KEYS.join(', ')})
       VALUES (?, ${PROGRAM_KEYS.map(() => '?').join(', ')})`,
      cleanClientId,
      ...values
    );

    await db.run('INSERT INTO OnboardingDetails (ClientID, Notes) VALUES (?, ?)', cleanClientId, notes);

    if (assignedTechId != null) {
      await db.run('INSERT INTO Notification (ClientID, TechID, Message) VALUES (?, ?, ?)', cleanClientId, assignedTechId, 'New client assigned to you.');
      await db.run('INSERT INTO LastAssignedTech (UserID) VALUES (?)', assignedTechId);
    }

    return res.status(201).json({ ok: true, uploadToken: token });
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Database constraint error while creating client. Check selected Tech/Sales users and unique Client ID.' });
    }
    return res.status(500).json({ error: 'Failed to create client.' });
  }
});

router.get('/:clientId', async (req, res) => {
  const db = await getDb();
  const client = await db.get('SELECT * FROM Onboarding WHERE ClientID = ?', req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Not found' });

  const details = await db.get('SELECT * FROM OnboardingDetails WHERE ClientID = ?', req.params.clientId);
  const history = await db.all('SELECT * FROM OnboardingHistory WHERE ClientID = ? ORDER BY HistoryID DESC', req.params.clientId);
  const entitled = await db.get('SELECT * FROM EntitledPrograms WHERE ClientID = ?', req.params.clientId);

  res.json({ client, details, history, entitled });
});

router.put('/:clientId', async (req, res) => {
  const db = await getDb();
  const { clientName, assignedTech, salesRep, email, phoneNumber, previousSoftware, conversionNeeded, spanish, bankEnrollment, packageName, readyToCall } = req.body;

  await db.run(
    `UPDATE Onboarding
       SET ClientName=?, AssignedTech=?, SalesRep=?, Email=?, PhoneNumber=?, PreviousSoftware=?, ConvertionNeeded=?, Spanish=?, BankEnrollment=?, Package=?, ReadyToCall=?
     WHERE ClientID=?`,
    clientName, assignedTech, salesRep, email, phoneNumber, previousSoftware, conversionNeeded, spanish, bankEnrollment, packageName, readyToCall ? 1 : 0,
    req.params.clientId
  );

  await db.run('INSERT INTO OnboardingHistory (ClientID, ActionType, ActionDetails, EditedBy) VALUES (?, ?, ?, ?)', req.params.clientId, 'Client Updated', 'Client record updated', req.user.username);

  res.json({ ok: true });
});

router.delete('/:clientId', async (req, res) => {
  if (!['admin', 'sales'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const db = await getDb();
  await db.run('DELETE FROM Onboarding WHERE ClientID = ?', req.params.clientId);
  res.json({ ok: true });
});

router.post('/bulk-delete', async (req, res) => {
  if (!['admin', 'sales'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { clientIds = [] } = req.body;
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ error: 'clientIds must be a non-empty array' });
  }

  const db = await getDb();
  const placeholders = clientIds.map(() => '?').join(', ');
  await db.run(`DELETE FROM Onboarding WHERE ClientID IN (${placeholders})`, ...clientIds);
  res.json({ ok: true, deleted: clientIds.length });
});

router.patch('/:clientId/status', async (req, res) => {
  const { field, value } = req.body;
  if (!STATUS_FIELDS.has(field)) return res.status(400).json({ error: 'Invalid field' });

  const db = await getDb();
  await db.run(`UPDATE Onboarding SET ${field} = ? WHERE ClientID = ?`, value, req.params.clientId);
  res.json({ ok: true });
});

router.patch('/:clientId/checklist', async (req, res) => {
  const { item, checked } = req.body;
  if (!CHECKLIST_ITEMS.has(item)) return res.status(400).json({ error: 'Invalid checklist item' });
  const db = await getDb();

  await db.run(`UPDATE Onboarding SET ${item} = ? WHERE ClientID = ?`, checked ? 1 : 0, req.params.clientId);

  const client = await db.get('SELECT * FROM Onboarding WHERE ClientID = ?', req.params.clientId);
  const settings = await getSettings(db);
  const progress = calculateProgress(client, settings);

  const completed = progress === 100 ? 1 : 0;
  const completedUntilNewVersion = Number(settings.NewSoftwareRelease) === 1 ? completed : 0;

  await db.run(
    'UPDATE Onboarding SET Progress=?, Completed=?, CompletedUntilNewVersion=? WHERE ClientID=?',
    progress,
    completed,
    completedUntilNewVersion,
    req.params.clientId
  );

  res.json({ ok: true, progress });
});

router.put('/:clientId/details', async (req, res) => {
  const db = await getDb();
  const { firstCallout, followUpCalls, notes } = req.body;

  await db.run(
    `INSERT INTO OnboardingDetails (ClientID, FirstCallout, FollowUpCalls, Notes)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(ClientID) DO UPDATE SET FirstCallout=excluded.FirstCallout, FollowUpCalls=excluded.FollowUpCalls, Notes=excluded.Notes`,
    req.params.clientId,
    firstCallout || '',
    followUpCalls || '',
    notes || ''
  );

  await db.run('INSERT INTO OnboardingHistory (ClientID, ActionType, ActionDetails, EditedBy) VALUES (?, ?, ?, ?)', req.params.clientId, 'Details Updated', 'Updated client details', req.user.username);

  res.json({ ok: true });
});

router.post('/:clientId/regenerate-upload-token', async (req, res) => {
  const db = await getDb();
  const token = crypto.randomBytes(16).toString('hex');
  await db.run('UPDATE Onboarding SET UploadToken = ? WHERE ClientID = ?', token, req.params.clientId);
  await db.run(
    'INSERT INTO OnboardingHistory (ClientID, ActionType, ActionDetails, EditedBy) VALUES (?, ?, ?, ?)',
    req.params.clientId,
    'Upload Token Regenerated',
    'Upload token was regenerated',
    req.user.username
  );
  res.json({ ok: true, uploadToken: token });
});

router.get('/:clientId/programs', async (req, res) => {
  const db = await getDb();
  const programs = await db.get('SELECT * FROM EntitledPrograms WHERE ClientID = ?', req.params.clientId);
  res.json(programs || {});
});

router.put('/:clientId/programs', async (req, res) => {
  const db = await getDb();
  const vals = PROGRAM_KEYS.map((k) => (req.body[k] ? 1 : 0));
  const setClause = PROGRAM_KEYS.map((k) => `${k}=?`).join(', ');
  await db.run(`UPDATE EntitledPrograms SET ${setClause} WHERE ClientID = ?`, ...vals, req.params.clientId);
  res.json({ ok: true });
});

export default router;
