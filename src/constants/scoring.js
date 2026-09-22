// GB/T 42195-2022《老年人能力评估规范》评分表
// 注：各维度等级阈值与综合评级规则均为占位/近似实现，需专业老师最终确认后调整。

// 综合能力等级
export const LEVELS = {
  0: '能力完好',
  1: '轻度失能',
  2: '中度失能',
  3: '重度失能',
}

// 维度受损等级
export const DIMENSION_LEVELS = {
  0: '完好',
  1: '轻度受损',
  2: '中度受损',
  3: '重度受损',
}

// 二级指标选项（每项 0 / 1 / 2 分）
export const ITEM_OPTIONS = [
  { value: 0, label: '0 分' },
  { value: 1, label: '1 分' },
  { value: 2, label: '2 分' },
]

// 4 个一级指标、22 个二级指标
export const DIMENSIONS = [
  {
    key: 'adl',
    name: '日常生活活动能力',
    items: [
      { key: 'feeding', name: '进食' },
      { key: 'dressing', name: '穿脱衣' },
      { key: 'bowel', name: '大便控制' },
      { key: 'bladder', name: '小便控制' },
      { key: 'toileting', name: '如厕' },
      { key: 'transfer', name: '床椅转移' },
      { key: 'walking', name: '平地行走' },
      { key: 'stairs', name: '上下楼梯' },
      { key: 'bathing', name: '洗澡' },
      { key: 'grooming', name: '修饰' },
    ],
  },
  {
    key: 'mental',
    name: '精神状态',
    items: [
      { key: 'cognition', name: '认知功能' },
      { key: 'aggression', name: '攻击行为' },
      { key: 'depression', name: '抑郁症状' },
    ],
  },
  {
    key: 'sensory',
    name: '感知觉与沟通',
    items: [
      { key: 'consciousness', name: '意识水平' },
      { key: 'vision', name: '视力' },
      { key: 'hearing', name: '听力' },
      { key: 'communication', name: '沟通交流' },
    ],
  },
  {
    key: 'social',
    name: '社会参与',
    items: [
      { key: 'lifeAbility', name: '生活能力' },
      { key: 'workAbility', name: '工作能力' },
      { key: 'timeOrientation', name: '时间/空间定向' },
      { key: 'personOrientation', name: '人物定向' },
      { key: 'socialContact', name: '社会交往能力' },
    ],
  },
]

// 各维度「总分 → 等级」阈值（可配置常量，需专业老师确认）
// 结构：按顺序匹配，分数 <= max 即落入该等级
export const DIMENSION_THRESHOLDS = {
  adl: [
    { max: 0, level: 0 },
    { max: 5, level: 1 },
    { max: 12, level: 2 },
    { max: Infinity, level: 3 },
  ],
  mental: [
    { max: 0, level: 0 },
    { max: 2, level: 1 },
    { max: 4, level: 2 },
    { max: Infinity, level: 3 },
  ],
  sensory: [
    { max: 0, level: 0 },
    { max: 2, level: 1 },
    { max: 5, level: 2 },
    { max: Infinity, level: 3 },
  ],
  social: [
    { max: 0, level: 0 },
    { max: 3, level: 1 },
    { max: 6, level: 2 },
    { max: Infinity, level: 3 },
  ],
}

// 计算某个维度的受损等级
export function computeDimensionLevel(dimKey, totalScore) {
  const thresholds = DIMENSION_THRESHOLDS[dimKey] || []
  for (const t of thresholds) {
    if (totalScore <= t.max) return t.level
  }
  return 3
}

// 计算综合能力等级
// 规则：全完好→能力完好；出现轻度(无中/重度)→轻度；出现中度(无重度)→中度；出现重度→重度
export function computeOverallLevel(dimensionLevels) {
  const levels = Object.values(dimensionLevels)
  if (levels.includes(3)) return 3
  if (levels.includes(2)) return 2
  if (levels.includes(1)) return 1
  return 0
}

// 所有二级指标（扁平列表，便于遍历初始化）
export const ALL_ITEMS = DIMENSIONS.flatMap((d) =>
  d.items.map((item) => ({ ...item, dimKey: d.key, dimName: d.name }))
)
