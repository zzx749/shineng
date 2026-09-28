// 前端(camelCase) <-> 后端(snake_case) 字段与枚举映射
// 依据 1/api-docs.md：外层字段 snake_case，主键 id 为数字；
// scores 内 5 个 social 项（lifeAbility/workAbility/timeOrientation/personOrientation/socialContact）保留 camelCase。

const GENDER_FROM_API = { MALE: '男', FEMALE: '女' }
const GENDER_TO_API = { 男: 'MALE', 女: 'FEMALE' }

// 老人：后端 snake_case -> 前端 camelCase（gender MALE/FEMALE -> 男/女）
export function elderFromApi(e) {
  if (!e) return e
  return {
    ...e,
    idCard: e.id_card,
    childrenPhone: e.children_phone,
    gender: GENDER_FROM_API[e.gender] ?? e.gender ?? '',
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

// 老人：前端 camelCase -> 后端 snake_case（gender 男/女 -> MALE/FEMALE）
export function elderToApi(payload) {
  const out = { ...payload }
  if (out.idCard !== undefined) {
    out.id_card = out.idCard
    delete out.idCard
  }
  if (out.childrenPhone !== undefined) {
    out.children_phone = out.childrenPhone
    delete out.childrenPhone
  }
  if (out.gender !== undefined) {
    out.gender = GENDER_TO_API[out.gender] ?? out.gender
  }
  return out
}

// 评估：后端 snake_case -> 前端 camelCase（scores/dimension_levels 内容保持原样）
export function assessmentFromApi(a) {
  if (!a) return a
  return {
    ...a,
    elderId: a.elder_id,
    dimensionLevels: a.dimension_levels,
    computedLevel: a.computed_level,
    manualLevel: a.manual_level,
    correctionNote: a.correction_note,
    assessorId: a.assessor_id,
    createdAt: a.created_at,
  }
}

// 评估：前端 camelCase -> 后端 snake_case
// corrected / assessor / assessor_id 由后端根据 token 与等级差自动处理，前端不上传
export function assessmentToApi(payload) {
  const {
    elderId,
    dimensionLevels,
    computedLevel,
    manualLevel,
    correctionNote,
    corrected,
    assessor,
    assessorId,
    ...rest
  } = payload
  const out = { ...rest }
  if (elderId !== undefined && elderId !== null && elderId !== '') out.elder_id = Number(elderId)
  if (dimensionLevels !== undefined) out.dimension_levels = dimensionLevels
  if (computedLevel !== undefined) out.computed_level = computedLevel
  if (manualLevel !== undefined) out.manual_level = manualLevel
  if (correctionNote !== undefined) out.correction_note = correctionNote
  return out
}
