const express = require('express');
const db = require('../db');
const { authenticate, requireRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings - Get all settings
router.get('/', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const settings = db.prepare('SELECT * FROM AdminSettings').all();
  const settingsMap = {};
  for (const s of settings) {
    settingsMap[s.SettingName] = s.SettingValue;
  }
  res.json(settingsMap);
});

// PUT /api/settings/:name - Update a setting
router.put('/:name', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const { value } = req.body;
  const existing = db.prepare('SELECT * FROM AdminSettings WHERE SettingName = ?').get(req.params.name);

  if (existing) {
    db.prepare(`
      UPDATE AdminSettings SET SettingValue = ?, UserID = ?, UpdatedAt = datetime('now')
      WHERE SettingName = ?
    `).run(String(value), req.user.userId, req.params.name);
  } else {
    db.prepare(`
      INSERT INTO AdminSettings (SettingName, SettingValue, UserID)
      VALUES (?, ?, ?)
    `).run(req.params.name, String(value), req.user.userId);
  }

  res.json({ success: true });
});

// --- Custom Packages ---

// GET /api/settings/packages - List custom packages
router.get('/packages', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const packages = db.prepare('SELECT * FROM CustomPackages ORDER BY PackageName').all();
  res.json(packages.map(p => ({ ...p, Programs: JSON.parse(p.Programs) })));
});

// POST /api/settings/packages - Create custom package
router.post('/packages', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const { packageName, programs } = req.body;
  if (!packageName) return res.status(400).json({ error: 'Package name is required' });

  try {
    const result = db.prepare('INSERT INTO CustomPackages (PackageName, Programs) VALUES (?, ?)').run(
      packageName, JSON.stringify(programs || [])
    );
    res.status(201).json({ success: true, packageId: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Package name already exists' });
    }
    throw err;
  }
});

// PUT /api/settings/packages/:id - Update custom package
router.put('/packages/:id', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const { packageName, programs } = req.body;

  db.prepare(`
    UPDATE CustomPackages SET
      PackageName = COALESCE(?, PackageName),
      Programs = COALESCE(?, Programs)
    WHERE PackageID = ?
  `).run(packageName ?? null, programs ? JSON.stringify(programs) : null, req.params.id);

  res.json({ success: true });
});

// DELETE /api/settings/packages/:id - Delete custom package
router.delete('/packages/:id', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const result = db.prepare('DELETE FROM CustomPackages WHERE PackageID = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Package not found' });
  res.json({ success: true });
});

module.exports = router;
