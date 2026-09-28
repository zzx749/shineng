const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get, all } = require('../db/init');
const { auth, requireAdmin, sanitizeUser } = require('../middleware/auth');

const router = express.Router();
router.use(auth, requireAdmin);

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const rows = await all('SELECT * FROM users WHERE is_deleted = 0 ORDER BY created_at ASC');
    res.json({ list: rows.map(sanitizeUser), total: rows.length });
  } catch (e) {
    next(e);
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing) return res.status(404).json({ message: '用户不存在' });

    const body = req.body || {};
    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    const role = body.role !== undefined ? body.role : existing.role;
    if (!name) return res.status(400).json({ message: '姓名不能为空' });
    if (role !== 'admin' && role !== 'staff') {
      return res.status(400).json({ message: '角色必须为 admin 或 staff' });
    }

    let password = existing.password;
    if (body.password) {
      password = await bcrypt.hash(body.password, 10);
    }

    await run('UPDATE users SET name = ?, role = ?, password = ?, updated_at = ? WHERE id = ?', [
      name,
      role,
      password,
      Date.now(),
      req.params.id
    ]);
    const row = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(sanitizeUser(row));
  } catch (e) {
    next(e);
  }
});

// DELETE /api/users/:id（软删除，禁止删除自己）
router.delete('/:id', async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: '不能删除自己' });
    }
    const existing = await get('SELECT id FROM users WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing) return res.status(404).json({ message: '用户不存在' });
    const now = Date.now();
    await run('UPDATE users SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
