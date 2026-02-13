const express = require('express');
const db = require('../db');
const { authenticate, requireRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/history - Get audit trail
router.get('/', authenticate, requireRoles('admin'), (req, res) => {
  const { clientId, userId, limit = 100, offset = 0 } = req.query;

  let where = [];
  let params = [];

  if (clientId) {
    where.push('h.ClientID = ?');
    params.push(clientId);
  }
  if (userId) {
    where.push('h.EditedBy = ?');
    params.push(userId);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const history = db.prepare(`
    SELECT h.*, u.Username, u.FirstName || ' ' || u.LastName AS EditedByName
    FROM OnboardingHistory h
    LEFT JOIN Users u ON h.EditedBy = u.UserID
    ${whereClause}
    ORDER BY h.DateEdited DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM OnboardingHistory h ${whereClause}
  `).get(...params);

  res.json({ history, total: total.count });
});

// PUT /api/history/:id - Update history entry (admin)
router.put('/:id', authenticate, requireRoles('admin'), (req, res) => {
  const { actionType, actionDetails } = req.body;

  db.prepare(`
    UPDATE OnboardingHistory SET
      ActionType = COALESCE(?, ActionType),
      ActionDetails = COALESCE(?, ActionDetails)
    WHERE HistoryID = ?
  `).run(actionType ?? null, actionDetails ?? null, req.params.id);

  res.json({ success: true });
});

// DELETE /api/history/:id - Delete history entry (admin)
router.delete('/:id', authenticate, requireRoles('admin'), (req, res) => {
  const result = db.prepare('DELETE FROM OnboardingHistory WHERE HistoryID = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'History entry not found' });
  res.json({ success: true });
});

module.exports = router;
