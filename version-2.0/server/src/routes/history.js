import express from 'express';
import { getDb } from '../db.js';
import { authRequired, allowRoles } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired);

router.get('/:clientId', async (req, res) => {
  const db = await getDb();
  const rows = await db.all(
    `SELECT h.*,
      u.FirstName || ' ' || u.LastName AS EditedByName
     FROM OnboardingHistory h
     LEFT JOIN Users u ON CAST(h.EditedBy AS INTEGER) = u.UserID
     WHERE h.ClientID = ?
     ORDER BY h.HistoryID DESC`,
    req.params.clientId
  );
  res.json(rows);
});

router.put('/:historyId', allowRoles('admin', 'sales'), async (req, res) => {
  const db = await getDb();
  const { actionType, actionDetails, editedBy } = req.body;
  await db.run(
    'UPDATE OnboardingHistory SET ActionType = ?, ActionDetails = ?, EditedBy = ? WHERE HistoryID = ?',
    actionType,
    actionDetails,
    editedBy || req.user.username,
    req.params.historyId
  );
  res.json({ ok: true });
});

router.delete('/:historyId', allowRoles('admin', 'sales'), async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM OnboardingHistory WHERE HistoryID = ?', req.params.historyId);
  res.json({ ok: true });
});

export default router;
