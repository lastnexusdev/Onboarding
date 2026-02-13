const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/programs/:clientId - Get entitled programs for a client
router.get('/:clientId', authenticate, (req, res) => {
  const db = req.db;
  const programs = db.prepare('SELECT * FROM EntitledPrograms WHERE ClientID = ?').get(req.params.clientId);
  if (!programs) {
    return res.status(404).json({ error: 'Programs not found for this client' });
  }
  res.json(programs);
});

// PUT /api/programs/:clientId - Update entitled programs
router.put('/:clientId', authenticate, (req, res) => {
  const db = req.db;
  const { programs } = req.body;
  const allProgs = ['prog_1040','prog_Depreciation','prog_Proforma','prog_1120','prog_1120S','prog_1065','prog_1041','prog_706Estate','prog_709Gift','prog_990Exempt','prog_DocArk','prog_1099Acc'];

  const existing = db.prepare('SELECT * FROM EntitledPrograms WHERE ClientID = ?').get(req.params.clientId);
  if (!existing) {
    const values = {};
    allProgs.forEach(p => values[p] = programs && programs[p] ? 1 : 0);
    db.prepare(`
      INSERT INTO EntitledPrograms (ClientID, prog_1040, prog_Depreciation, prog_Proforma,
        prog_1120, prog_1120S, prog_1065, prog_1041, prog_706Estate, prog_709Gift,
        prog_990Exempt, prog_DocArk, prog_1099Acc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.clientId, values.prog_1040, values.prog_Depreciation, values.prog_Proforma,
      values.prog_1120, values.prog_1120S, values.prog_1065, values.prog_1041,
      values.prog_706Estate, values.prog_709Gift, values.prog_990Exempt,
      values.prog_DocArk, values.prog_1099Acc
    );
  } else {
    const sets = allProgs.map(p => `${p} = ?`).join(', ');
    const vals = allProgs.map(p => programs && programs[p] ? 1 : 0);
    db.prepare(`UPDATE EntitledPrograms SET ${sets} WHERE ClientID = ?`).run(...vals, req.params.clientId);
  }

  res.json({ success: true });
});

module.exports = router;
