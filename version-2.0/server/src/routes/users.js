import express from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { authRequired, allowRoles } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired);

router.get('/directory', async (_req, res) => {
  const db = await getDb();
  const users = await db.all(
    `SELECT UserID, FirstName, LastName, Role, Department, Spanish
     FROM Users
     ORDER BY FirstName, LastName`
  );
  res.json(users);
});

router.get('/', allowRoles('admin'), async (_req, res) => {
  const db = await getDb();
  const users = await db.all(`
    SELECT u.UserID, u.Username, u.FirstName, u.LastName, u.Email, u.Role, u.Department, u.Spanish,
      (SELECT COUNT(*) FROM Onboarding WHERE AssignedTech = u.UserID) AS assigned_clients
    FROM Users u
    ORDER BY u.Department, u.FirstName, u.LastName
  `);
  res.json(users);
});

router.post('/', allowRoles('admin'), async (req, res) => {
  const { username, password, firstName, lastName, email, role, department, spanish } = req.body;
  const db = await getDb();
  const existing = await db.get('SELECT UserID FROM Users WHERE Username = ?', username);
  if (existing) return res.status(409).json({ error: 'Username already exists' });

  const hash = await bcrypt.hash(password, 10);
  const result = await db.run(
    `INSERT INTO Users (Username, Password, FirstName, LastName, Email, Role, Department, Spanish)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    username, hash, firstName, lastName, email, role, Number(department), spanish ? 1 : 0
  );
  res.status(201).json({ userId: result.lastID });
});

router.put('/:id', allowRoles('admin'), async (req, res) => {
  const db = await getDb();
  const id = Number(req.params.id);
  const { username, password, firstName, lastName, email, role, department, spanish } = req.body;

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await db.run(
      `UPDATE Users SET Username=?, Password=?, FirstName=?, LastName=?, Email=?, Role=?, Department=?, Spanish=? WHERE UserID=?`,
      username, hash, firstName, lastName, email, role, Number(department), spanish ? 1 : 0, id
    );
  } else {
    await db.run(
      `UPDATE Users SET Username=?, FirstName=?, LastName=?, Email=?, Role=?, Department=?, Spanish=? WHERE UserID=?`,
      username, firstName, lastName, email, role, Number(department), spanish ? 1 : 0, id
    );
  }

  res.json({ ok: true });
});

router.delete('/:id', allowRoles('admin'), async (req, res) => {
  const db = await getDb();
  const id = Number(req.params.id);

  if (id === req.user.userId) return res.status(400).json({ error: 'Cannot delete your own account' });

  const assigned = await db.get('SELECT COUNT(*) AS count FROM Onboarding WHERE AssignedTech = ?', id);
  if (assigned.count > 0) return res.status(400).json({ error: 'Cannot delete user with assigned clients' });

  await db.run('DELETE FROM Users WHERE UserID = ?', id);
  res.json({ ok: true });
});

export default router;
