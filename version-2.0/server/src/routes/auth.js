import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await getDb();
  const user = await db.get('SELECT * FROM Users WHERE Username = ?', username);
  if (!user) return res.status(401).json({ error: 'Invalid username/password' });

  const ok = await bcrypt.compare(password, user.Password);
  if (!ok) return res.status(401).json({ error: 'Invalid username/password' });

  const token = jwt.sign(
    { userId: user.UserID, username: user.Username, role: user.Role, department: user.Department },
    process.env.JWT_SECRET,
    { expiresIn: '10h' }
  );

  res.json({ token, user: { id: user.UserID, username: user.Username, role: user.Role, department: user.Department } });
});

router.get('/me', authRequired, async (req, res) => {
  const db = await getDb();
  const user = await db.get(
    'SELECT UserID, Username, FirstName, LastName, Email, Role, Department, Spanish FROM Users WHERE UserID = ?',
    req.user.userId
  );
  res.json({
    id: user.UserID,
    username: user.Username,
    firstName: user.FirstName,
    lastName: user.LastName,
    email: user.Email,
    role: user.Role,
    department: user.Department,
    spanish: Boolean(user.Spanish),
  });
});

export default router;
