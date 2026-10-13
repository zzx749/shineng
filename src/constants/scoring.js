// GB/T 42195-2022《老年人能力评估规范》评分表
// 4 个一级指标、26 个二级指标；条目加和计分，总分 0~90，得分越高能力越好。
// 多数指标 0~4 分五档，个别指标 0~3 / 0~2 / 0~1 分（见各 item.max）。

// 综合能力等级（5 级，对应国标表 6：能力完好/轻度受损/中度受损/重度受损/能力完全丧失）
export const LEVELS = {
  0: '能力完好',
  1: '轻度失能',
  2: '中度失能',
  3: '重度失能',
  4: '完全失能',
}

// 总分 → 能力等级阈值（国标表 6）
export const LEVEL_THRESHOLDS = [
  { min: 90, level: 0 }, // 能力完好
  { min: 66, level: 1 }, // 轻度失能
  { min: 46, level: 2 }, // 中度失能
  { min: 30, level: 3 }, // 重度失能
  { min: 0, level: 4 }, // 完全失能
]

// 4 个一级指标、26 个二级指标（max 为该指标满分）
export const DIMENSIONS = [
  {
    key: 'selfcare',
    name: '自理能力',
    items: [
      { key: 'eating', name: '进食', max: 4 },
      { key: 'grooming', name: '修饰', max: 4 },
      { key: 'bathing', name: '洗澡', max: 4 },
      { key: 'dressingUpper', name: '穿/脱上衣', max: 4 },
      { key: 'dressingLower', name: '穿/脱裤子和鞋袜', max: 4 },
      { key: 'urineControl', name: '小便控制', max: 4 },
      { key: 'stoolControl', name: '大便控制', max: 4 },
      { key: 'toileting', name: '如厕', max: 4 },
    ],
  },
  {
    key: 'mobility',
    name: '基础运动能力',
    items: [
      { key: 'bedMobility', name: '床上体位转移', max: 4 },
      { key: 'chairTransfer', name: '床椅转移', max: 4 },
      { key: 'walking', name: '平地行走', max: 4 },
      { key: 'stairs', name: '上下楼梯', max: 3 },
    ],
  },
  {
    key: 'mental',
    name: '精神状态',
    items: [
      { key: 'timeOrientation', name: '时间定向', max: 4 },
      { key: 'spaceOrientation', name: '空间定向', max: 4 },
      { key: 'personOrientation', name: '人物定向', max: 4 },
      { key: 'memory', name: '记忆', max: 4 },
      { key: 'comprehension', name: '理解能力', max: 4 },
      { key: 'expression', name: '表达能力', max: 4 },
      { key: 'aggression', name: '攻击行为', max: 1 },
      { key: 'depression', name: '抑郁症状', max: 1 },
      { key: 'consciousness', name: '意识水平', max: 2 },
    ],
  },
  {
    key: 'sensorySocial',
    name: '感知觉与社会参与',
    items: [
      { key: 'vision', name: '视力', max: 2 },
      { key: 'hearing', name: '听力', max: 2 },
      { key: 'dailyAffairs', name: '执行日常事务', max: 4 },
      { key: 'transport', name: '使用交通工具外出', max: 3 },
      { key: 'socialContact', name: '社会交往能力', max: 4 },
    ],
  },
]

// 所有二级指标（扁平列表，便于遍历初始化）
export const ALL_ITEMS = DIMENSIONS.flatMap((d) =>
  d.items.map((item) => ({ ...item, dimKey: d.key, dimName: d.name }))
)

// 各指标满分表（后端校验、前端计算共用）
export const MAX_SCORES = Object.fromEntries(ALL_ITEMS.map((it) => [it.key, it.max]))

// 某指标的可选分值（0..max，从小到大）
export function optionsFor(max) {
  return Array.from({ length: max + 1 }, (_, v) => v)
}

// 把某个分值归一化为「受损程度」0（完好）~4（完全丧失），用于高亮配色
export function scoreRank(max, value) {
  if (value === null || value === undefined || value === '') return -1
  if (max <= 0) return 0
  return Math.round(((max - value) / max) * 4)
}

// 总分（0~90）：仅累加已作答项（null 视为未评，不计入）
export function computeTotalScore(scores) {
  return ALL_ITEMS.reduce((sum, it) => {
    const v = Number(scores?.[it.key])
    return Number.isInteger(v) && v >= 0 ? sum + v : sum
  }, 0)
}

// 总分 → 能力等级（0~4）
export function computeLevelByTotal(total) {
  for (const t of LEVEL_THRESHOLDS) {
    if (total >= t.min) return t.level
  }
  return 4
}

// 各维度小计得分（分量表得分）
export function computeDimensionScores(scores) {
  return Object.fromEntries(
    DIMENSIONS.map((d) => [
      d.key,
      d.items.reduce((sum, it) => {
        const v = Number(scores?.[it.key])
        return Number.isInteger(v) && v >= 0 ? sum + v : sum
      }, 0),
    ])
  )
}

// 综合能力等级：
// 1) 意识水平为 0 分（昏睡或昏迷）→ 直接判定「完全失能」（等级 4，国标 5.3.5 注 1）；
// 2) 否则按总分映射（国标表 6）。
// 注：国标 5.3.5 注 2 的「痴呆/其他精神行为障碍/近30天内2次照护风险事件→提高一级」需额外采集
//     诊断与风险事件信息，暂未纳入，可后续补充字段。
export function computeOverallLevel(scores) {
  if (Number(scores?.consciousness) === 0) return 4
  return computeLevelByTotal(computeTotalScore(scores))
}
