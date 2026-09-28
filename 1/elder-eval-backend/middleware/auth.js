const jwt = require('jsonwebtoken');
const { get } = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'elder-eval-secret-2026';
const JWT_EXPIRES = '7d';

function sanitizeUser(user) {
  if (!user) return user;
  const { password, is_deleted, deleted_at, ...rest } = user;
  return rest;
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ message: '未登录或 token 缺失' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ message: 'token 无效或已过期' });
  }

  let user;
  try {
    // 软删除用户不可再登录/访问
    user = await get('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [payload.userId]);
  } catch (e) {
    return next(e);
  }

  if (!user) {
    return res.status(401).json({ message: 'token 无效或已过期' });
  }

  req.user = sanitizeUser(user);
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '无权限，仅管理员可操作' });
  }
  next();
}

module.exports = { auth, requireAdmin, sanitizeUser, JWT_SECRET, JWT_EXPIRES };
