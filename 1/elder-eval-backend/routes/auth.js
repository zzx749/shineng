const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get } = require('../db/init');
const { auth, sanitizeUser, JWT_SECRET, JWT_EXPIRES } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    const user = await get('SELECT * FROM users WHERE username = ? AND is_deleted = 0', [username]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    const token = signToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (e) {
    return next(e);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, name } = req.body || {};
    if (!username || !password || !name) {
      return res.status(400).json({ message: '用户名、密码、姓名不能为空' });
    }
    const existing = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    const hash = await bcrypt.hash(password, 10);
    const now = Date.now();
    const result = await run(
      'INSERT INTO users (username, password, name, role, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hash, name, 'staff', now, now, 0]
    );
    const user = { id: result.lastID, username, password: hash, name, role: 'staff', created_at: now, updated_at: now };
    const token = signToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (e) {
    return next(e);
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
