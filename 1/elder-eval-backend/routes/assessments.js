const express = require('express');
const { run, get, all } = require('../db/init');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const ASSESSMENT_FIELDS =
  'a.id, a.elder_id, a.scores, a.dimension_levels, a.computed_level, a.manual_level, a.corrected, a.correction_note, a.assessor, a.assessor_id, a.qa, a.date, a.created_at';

// 26 项国标打分 key 及各自满分（GB/T 42195-2022，多数 0~4，个别 0~3 / 0~2 / 0~1）
const SCORE_KEYS = {
  eating: 4, grooming: 4, bathing: 4, dressingUpper: 4, dressingLower: 4,
  urineControl: 4, stoolControl: 4, toileting: 4,
  bedMobility: 4, chairTransfer: 4, walking: 4, stairs: 3,
  timeOrientation: 4, spaceOrientation: 4, personOrientation: 4, memory: 4,
  comprehension: 4, expression: 4, aggression: 1, depression: 1, consciousness: 2,
  vision: 2, hearing: 2, dailyAffairs: 4, transport: 3, socialContact: 4
};

// 本地时区 YYYY-MM-DD（避免 toISOString 的 UTC 偏移）
function localDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function rowToAssessment(row) {
  if (!row) return row;
  let scores = {};
  let dimension_levels = {};
  try {
    scores = JSON.parse(row.scores);
  } catch (e) {
    scores = {};
  }
  try {
    dimension_levels = JSON.parse(row.dimension_levels);
  } catch (e) {
    dimension_levels = {};
  }
  let qa = null;
  try {
    qa = JSON.parse(row.qa);
  } catch (e) {
    qa = null;
  }
  return {
    id: row.id,
    elder_id: row.elder_id,
    scores,
    dimension_levels,
    computed_level: row.computed_level,
    manual_level: row.manual_level,
    corrected: !!row.corrected,
    correction_note: row.correction_note || '',
    assessor: row.assessor || '',
    assessor_id: row.assessor_id,
    qa,
    date: row.date,
    created_at: row.created_at
  };
}

// GET /api/assessments?elder_id=
router.get('/', async (req, res, next) => {
  try {
    const elder_id = (req.query.elder_id || '').trim();
    let rows;
    if (elder_id) {
      rows = await all(
        `SELECT ${ASSESSMENT_FIELDS} FROM assessments a JOIN elders e ON a.elder_id = e.id WHERE e.is_deleted = 0 AND a.is_deleted = 0 AND a.elder_id = ? ORDER BY a.created_at DESC`,
        [elder_id]
      );
    } else {
      rows = await all(
        `SELECT ${ASSESSMENT_FIELDS} FROM assessments a JOIN elders e ON a.elder_id = e.id WHERE e.is_deleted = 0 AND a.is_deleted = 0 ORDER BY a.created_at DESC`
      );
    }
    res.json({ list: rows.map(rowToAssessment), total: rows.length });
  } catch (e) {
    next(e);
  }
});

// POST /api/assessments
router.post('/', async (req, res, next) => {
  try {
    const { elder_id, scores, computed_level, manual_level, correction_note, date, qa } = req.body || {};
    if (!elder_id) return res.status(400).json({ message: 'elder_id 不能为空' });
    if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
      return res.status(400).json({ message: 'scores 不能为空' });
    }
    // scores 白名单 + 取值校验：key 限 26 项，取值 0~该项满分
    for (const [key, value] of Object.entries(scores)) {
      if (!(key in SCORE_KEYS)) {
        return res.status(400).json({ message: `scores 存在未知项：${key}` });
      }
      const n = Number(value);
      const max = SCORE_KEYS[key];
      if (!Number.isInteger(n) || n < 0 || n > max) {
        return res.status(400).json({ message: `scores.${key} 取值必须为 0~${max}` });
      }
    }

    // qa 可选：问答观察记录（照片 + 题目回答 + 规则总结），若有则校验基本结构
    if (qa !== undefined && qa !== null) {
      if (typeof qa !== 'object' || Array.isArray(qa)) {
        return res.status(400).json({ message: 'qa 格式不正确' });
      }
      if (qa.questions !== undefined) {
        if (!Array.isArray(qa.questions)) {
          return res.status(400).json({ message: 'qa.questions 必须是数组' });
        }
        for (const q of qa.questions) {
          if (q.answer !== undefined && q.answer !== null && q.answer !== '') {
            const n = Number(q.answer);
            if (!Number.isInteger(n) || n < 0 || n > 2) {
              return res.status(400).json({ message: 'qa.questions 的 answer 取值必须为 0/1/2' });
            }
          }
        }
      }
    }

    const elder = await get('SELECT id FROM elders WHERE id = ? AND is_deleted = 0', [elder_id]);
    if (!elder) return res.status(404).json({ message: '老人不存在' });

    const now = Date.now();
    const isAbsent = (v) => v === undefined || v === null || v === '';
    for (const [label, v] of [['computed_level', computed_level], ['manual_level', manual_level]]) {
      if (!isAbsent(v)) {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0 || n > 4) {
          return res.status(400).json({ message: `${label} 取值必须为 0-4` });
        }
      }
    }
    const computed = isAbsent(computed_level) ? 0 : Number(computed_level);
    const manual = isAbsent(manual_level) ? computed : Number(manual_level);
    // 纠正留痕：最终等级与系统计算等级不一致时，强制标记 corrected 并要求填写纠正说明
    const isCorrected = manual !== computed;
    if (isCorrected && !(correction_note && String(correction_note).trim())) {
      return res.status(400).json({ message: '纠正评估需填写纠正说明' });
    }

    const result = await run(
      'INSERT INTO assessments (elder_id, scores, dimension_levels, computed_level, manual_level, corrected, correction_note, qa, assessor, assessor_id, date, created_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        elder_id,
        JSON.stringify(scores),
        '{}',
        computed,
        manual,
        isCorrected ? 1 : 0,
        correction_note || '',
        qa ? JSON.stringify(qa) : null,
        req.user.name,
        req.user.id,
        date || localDate(),
        now,
        0
      ]
    );
    const row = await get(`SELECT ${ASSESSMENT_FIELDS} FROM assessments a WHERE a.id = ?`, [result.lastID]);
    res.status(201).json(rowToAssessment(row));
  } catch (e) {
    next(e);
  }
});

// GET /api/assessments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const row = await get(
      `SELECT ${ASSESSMENT_FIELDS} FROM assessments a JOIN elders e ON a.elder_id = e.id WHERE a.id = ? AND a.is_deleted = 0 AND e.is_deleted = 0`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ message: '评估记录不存在' });
    res.json(rowToAssessment(row));
  } catch (e) {
    next(e);
  }
});

// DELETE /api/assessments/:id（软删除，补全 CRUD）
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT id FROM assessments WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!existing) return res.status(404).json({ message: '评估记录不存在' });
    await run('UPDATE assessments SET is_deleted = 1, deleted_at = ? WHERE id = ?', [Date.now(), req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
module.exports.ASSESSMENT_FIELDS = ASSESSMENT_FIELDS;
module.exports.rowToAssessment = rowToAssessment;
