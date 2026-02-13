const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = req.db;
  const user = db.prepare('SELECT * FROM Users WHERE Username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bcrypt.compareSync(password, user.Password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    {
      userId: user.UserID,
      username: user.Username,
      role: user.Role,
      department: user.Department,
      firstName: user.FirstName,
      lastName: user.LastName,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      userId: user.UserID,
      username: user.Username,
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      role: user.Role,
      department: user.Department,
      spanish: user.Spanish,
    },
  });
});

router.get('/me', authenticate, (req, res) => {
  const db = req.db;
  const user = db.prepare('SELECT UserID, Username, FirstName, LastName, Email, Role, Department, Spanish FROM Users WHERE UserID = ?').get(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    userId: user.UserID,
    username: user.Username,
    firstName: user.FirstName,
    lastName: user.LastName,
    email: user.Email,
    role: user.Role,
    department: user.Department,
    spanish: user.Spanish,
  });
});

module.exports = router;
