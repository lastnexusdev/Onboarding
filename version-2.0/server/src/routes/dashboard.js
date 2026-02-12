import express from 'express';
import { getDb } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const db = await getDb();

  let filter = '';
  const params = [];
  if (req.user.department === 2 || req.user.role === 'tech') {
    filter = ' WHERE AssignedTech = ?';
    params.push(req.user.userId);
  }

  const stats = await db.get(
    `SELECT COUNT(*) as total_clients,
      SUM(CASE WHEN Progress = 100 THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN Progress > 0 AND Progress < 100 THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN Progress = 0 THEN 1 ELSE 0 END) as not_started,
      SUM(CASE WHEN Stalled = 1 THEN 1 ELSE 0 END) as stalled,
      SUM(CASE WHEN Cancelled = 1 THEN 1 ELSE 0 END) as cancelled,
      AVG(Progress) as avg_progress
      FROM Onboarding${filter}`,
    ...params
  );

  const clients = await db.all(`SELECT * FROM Onboarding${filter} ORDER BY DateAdded DESC`, ...params);

  const techs = await db.all('SELECT UserID, FirstName, LastName FROM Users WHERE Department = 2 ORDER BY FirstName');

  res.json({ stats, clients, techs });
});

export default router;
