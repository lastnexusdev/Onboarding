import express from 'express';
import { getDb } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired);

router.get('/', async (_req, res) => {
  const db = await getDb();

  const techAssignments = await db.all(`
    SELECT u.FirstName, u.LastName, COUNT(o.ClientID) AS AssignedClients
    FROM Users u
    LEFT JOIN Onboarding o ON o.AssignedTech = u.UserID
    WHERE u.Department = 2
    GROUP BY u.UserID
    ORDER BY AssignedClients DESC
  `);

  const statusSummary = await db.get(`
    SELECT
      COUNT(*) as total_clients,
      SUM(CASE WHEN Completed = 1 THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN Progress > 0 AND Progress < 100 THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN Progress = 0 THEN 1 ELSE 0 END) as not_started,
      SUM(CASE WHEN Stalled = 1 THEN 1 ELSE 0 END) as stalled,
      SUM(CASE WHEN Cancelled = 1 THEN 1 ELSE 0 END) as cancelled
    FROM Onboarding
  `);

  const packageMix = await db.all('SELECT Package, COUNT(*) as count FROM Onboarding GROUP BY Package ORDER BY count DESC');

  res.json({ techAssignments, statusSummary, packageMix });
});

export default router;
