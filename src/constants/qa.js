// 「问答观察」固定题目与规则总结
// 每题 1:1 映射到 GB/T 42195-2022 的精神状态 / 感知觉与沟通 / 社会参与相关二级指标。
// 不接大模型：总结由回答直接按模板生成，零成本、零依赖。

// 回答选项（0/1/2 分，与对应二级指标同语义）
export const QA_OPTIONS = [
  { value: 0, label: '正常 / 答对' },
  { value: 1, label: '部分 / 需提示' },
  { value: 2, label: '异常 / 无法' },
]

// 固定题目：key 即映射到的 22 项二级指标 key
export const QA_QUESTIONS = [
  { key: 'cognition', item: '认知功能', question: '请老人做简单计算（如 100 减 7），或复述三个词语。' },
  { key: 'timeOrientation', item: '时间/空间定向', question: '问：今天是几月几号、星期几？我们现在在哪儿？' },
  { key: 'personOrientation', item: '人物定向', question: '问：您叫什么名字？家里还有哪些人？' },
  { key: 'communication', item: '沟通交流', question: '请老人说一句完整的话，或描述今天吃了什么。' },
  { key: 'consciousness', item: '意识水平', question: '观察：老人是否清醒、能否听懂并配合提问。' },
  { key: 'aggression', item: '攻击行为', question: '观察：交谈过程中有无言语或肢体攻击、是否易怒。' },
  { key: 'depression', item: '抑郁症状', question: '观察：情绪是否低落、兴趣是否减退。' },
]

function optionLabel(value) {
  return QA_OPTIONS.find((o) => o.value === value)?.label || '未记录'
}

// 由题目回答生成观察总结（规则模板）
export function buildQaSummary(questions) {
  const answered = questions.filter((q) => q.answer !== null && q.answer !== undefined && q.answer !== '')
  if (!answered.length) return '未记录问答观察'
  const parts = answered.map((q) => `${q.item}：${optionLabel(q.answer)}`)
  return `问答观察：${parts.join('；')}。`
}
