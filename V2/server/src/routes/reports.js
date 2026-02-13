const express = require('express');
const { authenticate, requireRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports - Get reports data
router.get('/', authenticate, requireRoles('admin', 'sales'), (req, res) => {
  const db = req.db;
  // Tech assignments report
  const techAssignments = db.prepare(`
    SELECT u.UserID, u.FirstName, u.LastName,
           COUNT(o.ClientID) as totalClients,
           SUM(CASE WHEN o.Completed = 1 THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN o.Progress > 0 AND o.Progress < 100 AND o.Stalled = 0 AND o.Cancelled = 0 THEN 1 ELSE 0 END) as inProgress,
           SUM(CASE WHEN o.Stalled = 1 THEN 1 ELSE 0 END) as stalled,
           SUM(CASE WHEN o.Cancelled = 1 THEN 1 ELSE 0 END) as cancelled,
           ROUND(AVG(o.Progress), 1) as avgProgress
    FROM Users u
    LEFT JOIN Onboarding o ON u.UserID = o.AssignedTech
    WHERE u.Role = 'tech' OR u.Department = 2
    GROUP BY u.UserID
    ORDER BY u.FirstName
  `).all();

  // Client status summary
  const clientSummary = db.prepare(`
    SELECT o.ClientID, o.ClientName, o.Progress, o.DateAdded,
           o.Completed, o.Stalled, o.Cancelled, o.CompletedUntilNewVersion,
           o.Package, o.ConversionNeeded, o.BankEnrollment,
           u.FirstName || ' ' || u.LastName AS TechName,
           u2.FirstName || ' ' || u2.LastName AS SalesRepName
    FROM Onboarding o
    LEFT JOIN Users u ON o.AssignedTech = u.UserID
    LEFT JOIN Users u2 ON o.SalesRep = u2.UserID
    ORDER BY o.DateAdded DESC
  `).all();

  // Status distribution for charts
  const statusDistribution = db.prepare(`
    SELECT
      SUM(CASE WHEN Completed = 1 THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN Progress > 0 AND Progress < 100 AND Stalled = 0 AND Cancelled = 0 THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN Progress = 0 AND Stalled = 0 AND Cancelled = 0 AND Completed = 0 THEN 1 ELSE 0 END) as notStarted,
      SUM(CASE WHEN Stalled = 1 THEN 1 ELSE 0 END) as stalled,
      SUM(CASE WHEN Cancelled = 1 THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN CompletedUntilNewVersion = 1 THEN 1 ELSE 0 END) as pendingNewVersion
    FROM Onboarding
  `).get();

  // Package distribution
  const packageDistribution = db.prepare(`
    SELECT Package, COUNT(*) as count
    FROM Onboarding
    GROUP BY Package
  `).all();

  res.json({
    techAssignments,
    clientSummary,
    statusDistribution,
    packageDistribution,
  });
});

module.exports = router;
