const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - Get dashboard statistics
router.get('/', authenticate, (req, res) => {
  const db = req.db;
  let whereClause = '';
  let params = [];

  if (req.user.role === 'tech') {
    whereClause = 'WHERE o.AssignedTech = ?';
    params = [req.user.userId];
  }

  const stats = db.prepare(`
    SELECT
      COUNT(*) as totalClients,
      SUM(CASE WHEN o.Completed = 1 THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN o.Progress > 0 AND o.Progress < 100 AND o.Stalled = 0 AND o.Cancelled = 0 THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN o.Progress = 0 AND o.Stalled = 0 AND o.Cancelled = 0 AND o.Completed = 0 THEN 1 ELSE 0 END) as notStarted,
      SUM(CASE WHEN o.Stalled = 1 THEN 1 ELSE 0 END) as stalled,
      SUM(CASE WHEN o.Cancelled = 1 THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN o.CompletedUntilNewVersion = 1 THEN 1 ELSE 0 END) as pendingNewVersion,
      ROUND(AVG(o.Progress), 1) as avgProgress
    FROM Onboarding o
    ${whereClause}
  `).get(...params);

  const clients = db.prepare(`
    SELECT o.ClientID, o.ClientName, o.Progress, o.Completed, o.Stalled, o.Cancelled,
           o.CompletedUntilNewVersion, o.ReadyToCall, o.RowColor, o.DateAdded,
           o.PhoneNumber, o.Email, o.AssignedTech,
           u.FirstName || ' ' || u.LastName AS TechName
    FROM Onboarding o
    LEFT JOIN Users u ON o.AssignedTech = u.UserID
    ${whereClause}
    ORDER BY o.DateAdded DESC
  `).all(...params);

  const techRoster = db.prepare(`
    SELECT u.UserID, u.FirstName, u.LastName, u.Spanish,
           COUNT(o.ClientID) as clientCount,
           SUM(CASE WHEN o.Completed = 1 THEN 1 ELSE 0 END) as completedCount
    FROM Users u
    LEFT JOIN Onboarding o ON u.UserID = o.AssignedTech
    WHERE u.Role = 'tech' OR u.Department = 2
    GROUP BY u.UserID
    ORDER BY u.FirstName
  `).all();

  const newRelease = db.prepare("SELECT SettingValue FROM AdminSettings WHERE SettingName = 'NewSoftwareRelease'").get();

  res.json({
    stats: { ...stats, avgProgress: stats.avgProgress || 0 },
    clients,
    techRoster,
    newSoftwareRelease: newRelease ? newRelease.SettingValue === '1' : false,
  });
});

module.exports = router;
