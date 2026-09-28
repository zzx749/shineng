const express = require('express');
const { run, get, all } = require('../db/init');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const ELDER_FIELDS = 'id, name, gender, age, id_card, address, phone, children_phone, created_at, updated_at';

function deriveAge(id_card) {
  if (!id_card || String(id_card).length !== 18) return null;
  const str = String(id_card);
  const year = parseInt(str.slice(6, 10), 10);
  const month = parseInt(str.slice(10, 12), 10);
  const day = parseInt(str.slice(12, 14), 10);
  const now = new Date();
  let age = now.getFullYear() - year;
  const beforeBirthday =
    now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

// GET /api/elders?keyword=
router.get('/', async (req, res, next) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    let rows;
    if (keyword) {
      const like = `%${keyword}%`;
      rows = await all(
        `SELECT ${ELDER_FIELDS} FROM elders WHERE is_deleted = 0 AND (name LIKE ? OR id_card LIKE ? OR phone LIKE ?) ORDER BY created_at DESC`,
        [like, like, like]
      );
    } else {
      rows = await all(`SELECT ${ELDER_FIELDS} FROM elders WHERE is_deleted = 0 ORDER BY created_at DESC`);
    }
    res.json({ list: rows, total: rows.length });
  } catch (e) {
    next(e);
  }
});

// POST /api/elders
router.post('/', async (req, res, next) => {
  try {
    const { name, gender, age, id_card, address, phone, children_phone } = req.body || {};
    const trimmedName = name ? String(name).trim() : '';
    if (!trimmedName) {
      return res.status(400).json({ message: '老人姓名不能为空' });
    }
    const genderVal = gender || null;
    if (genderVal && genderVal !== 'MALE' && genderVal !== 'FEMALE') {
      return res.status(400).json({ message: 'gender 取值必须为 MALE 或 FEMALE' });
    }
    const now = Date.now();
    // 年龄未填时由身份证号自动推算
    const finalAge = age === undefined || age === null || age === '' ? deriveAge(id_card) : age;
    const result = await run(
      'INSERT INTO elders (name, gender, age, id_card, address, phone, children_phone, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [trimmedName, genderVal, finalAge, id_card || null, address || null, phone || null, children_phone || null, now, now, 0]
    );
    const row = await get(`SELECT ${ELDER_FIELDS} FROM elders WHERE id = ?`, [result.lastID]);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

// GET /api/elders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const row = await get(`SELECT ${ELDER_FIELDS} FROM elders WHERE id = ? AND is_deleted = 0`, [req.params.id]);
    if (!row) return res.status(404).json({ message: '老人不存在' });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

// PUT /api/elders/:id
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM elders WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing) return res.status(404).json({ message: '老人不存在' });

    const body = req.body || {};
    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    if (!name) return res.status(400).json({ message: '老人姓名不能为空' });
    const gender = body.gender !== undefined ? body.gender : existing.gender;
    if (gender && gender !== 'MALE' && gender !== 'FEMALE') {
      return res.status(400).json({ message: 'gender 取值必须为 MALE 或 FEMALE' });
    }
    const id_card = body.id_card !== undefined ? body.id_card : existing.id_card;
    let age;
    if (body.age !== undefined && body.age !== null && body.age !== '') {
      age = body.age;
    } else if (body.id_card !== undefined) {
      // 更新身份证时若未显式传 age 则重新推算
      age = deriveAge(body.id_card);
    } else {
      age = existing.age;
    }
    const address = body.address !== undefined ? body.address : existing.address;
    const phone = body.phone !== undefined ? body.phone : existing.phone;
    const children_phone = body.children_phone !== undefined ? body.children_phone : existing.children_phone;
    const updated_at = Date.now();

    await run(
      'UPDATE elders SET name = ?, gender = ?, age = ?, id_card = ?, address = ?, phone = ?, children_phone = ?, updated_at = ? WHERE id = ?',
      [name, gender, age, id_card, address, phone, children_phone, updated_at, req.params.id]
    );
    const row = await get(`SELECT ${ELDER_FIELDS} FROM elders WHERE id = ?`, [req.params.id]);
    res.json(row);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/elders/:id（软删除，不物理删除业务数据）
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT id FROM elders WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing) return res.status(404).json({ message: '老人不存在' });
    const now = Date.now();
    await run('UPDATE elders SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
module.exports.ELDER_FIELDS = ELDER_FIELDS;
