const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, requireRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - List all users
router.get('/', authenticate, (req, res) => {
  const users = db.prepare(`
    SELECT UserID, Username, FirstName, LastName, Email, Role, Department, Spanish, StartHour, EndHour, CreatedAt
    FROM Users ORDER BY UserID
  `).all();
  res.json(users);
});

// GET /api/users/techs - List technicians only
router.get('/techs', authenticate, (req, res) => {
  const techs = db.prepare(`
    SELECT UserID, Username, FirstName, LastName, Email, Spanish
    FROM Users WHERE Role = 'tech' OR Department = 2
    ORDER BY FirstName
  `).all();
  res.json(techs);
});

// GET /api/users/:id - Get single user
router.get('/:id', authenticate, (req, res) => {
  const user = db.prepare(`
    SELECT UserID, Username, FirstName, LastName, Email, Role, Department, Spanish, StartHour, EndHour
    FROM Users WHERE UserID = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/users - Create user (admin only)
router.post('/', authenticate, requireRoles('admin'), (req, res) => {
  const { username, password, firstName, lastName, email, role, department, spanish } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const existing = db.prepare('SELECT UserID FROM Users WHERE Username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO Users (Username, Password, FirstName, LastName, Email, Role, Department, Spanish)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(username, hash, firstName || '', lastName || '', email || '', role || 'tech', department || 2, spanish ? 1 : 0);

  res.status(201).json({ success: true, userId: result.lastInsertRowid });
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticate, requireRoles('admin'), (req, res) => {
  const { username, password, firstName, lastName, email, role, department, spanish } = req.body;
  const userId = req.params.id;

  const existing = db.prepare('SELECT * FROM Users WHERE UserID = ?').get(userId);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE Users SET Password = ? WHERE UserID = ?').run(hash, userId);
  }

  db.prepare(`
    UPDATE Users SET
      Username = COALESCE(?, Username),
      FirstName = COALESCE(?, FirstName),
      LastName = COALESCE(?, LastName),
      Email = COALESCE(?, Email),
      Role = COALESCE(?, Role),
      Department = COALESCE(?, Department),
      Spanish = COALESCE(?, Spanish)
    WHERE UserID = ?
  `).run(username ?? null, firstName ?? null, lastName ?? null, email ?? null, role ?? null, department ?? null, spanish !== undefined ? (spanish ? 1 : 0) : null, userId);

  res.json({ success: true });
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticate, requireRoles('admin'), (req, res) => {
  const userId = req.params.id;
  if (parseInt(userId) === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const result = db.prepare('DELETE FROM Users WHERE UserID = ?').run(userId);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });

  res.json({ success: true });
});

module.exports = router;
