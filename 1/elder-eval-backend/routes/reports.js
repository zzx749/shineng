const express = require('express');
const { get } = require('../db/init');
const { auth } = require('../middleware/auth');
const { ASSESSMENT_FIELDS, rowToAssessment } = require('./assessments');
const { ELDER_FIELDS } = require('./elders');

const router = express.Router();
router.use(auth);

// GET /api/reports/:assessmentId
router.get('/:assessmentId', async (req, res, next) => {
  try {
    const aRow = await get(
      `SELECT ${ASSESSMENT_FIELDS} FROM assessments a WHERE a.id = ? AND a.is_deleted = 0`,
      [req.params.assessmentId]
    );
    if (!aRow) return res.status(404).json({ message: '评估记录不存在' });
    // 老人已软删除时 elder 返回 null
    const eRow = await get(`SELECT ${ELDER_FIELDS} FROM elders WHERE id = ? AND is_deleted = 0`, [aRow.elder_id]);
    res.json({
      assessment: rowToAssessment(aRow),
      elder: eRow || null
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
