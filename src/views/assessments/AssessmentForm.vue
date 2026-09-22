<template>
  <div>
    <el-card>
      <template #header>失能等级评估</template>

      <el-form label-width="100px" class="elder-form">
        <el-form-item label="评估对象" required>
          <el-select
            v-model="elderId"
            placeholder="请选择老人"
            filterable
            style="width: 320px"
            @change="onElderChange"
          >
            <el-option v-for="e in elders" :key="e.id" :label="`${e.name}（${e.gender || ''} · ${e.age ?? '-'}岁）`" :value="e.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-divider content-position="left">评分指标（每项 0 / 1 / 2 分）</el-divider>
      <div v-for="dim in dimensionResults" :key="dim.key" class="assess-dim">
        <div class="assess-dim-title">{{ dim.name }}</div>
        <div class="assess-dim-score">
          得分 {{ dim.total }} 分 · {{ DIMENSION_LEVELS[dim.level] }}
        </div>
        <div v-for="item in dim.items" :key="item.key" class="assess-item">
          <span class="assess-item-name">{{ item.name }}</span>
          <el-radio-group v-model="scores[item.key]" size="small">
            <el-radio-button v-for="opt in ITEM_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <el-divider content-position="left">等级判定</el-divider>
      <div class="assess-summary">
        <el-descriptions :column="1" border size="small" style="max-width: 560px">
          <el-descriptions-item label="系统自动评定">
            <el-tag :type="overallTagType">{{ LEVELS[overallLevel] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="您的判断等级">
            <el-radio-group v-model="manualLevel">
              <el-radio v-for="(label, lv) in LEVELS" :key="lv" :value="Number(lv)">{{ label }}</el-radio>
            </el-radio-group>
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="mismatch"
          class="mismatch-tip"
          type="warning"
          :closable="false"
          show-icon
          title="判断与系统不一致"
          :description="`系统评定为「${LEVELS[overallLevel]}」，您判断为「${LEVELS[manualLevel]}」。若确认以系统为准，可一键纠正；若坚持您的判断，请填写纠正说明留痕。`"
        >
          <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px">
            <el-button size="small" type="primary" @click="applyComputed">一键纠正（采用系统结果）</el-button>
          </div>
        </el-alert>

        <el-form-item v-if="mismatch" label="纠正说明" label-width="100px" style="margin-top: 12px; max-width: 560px">
          <el-input v-model="correctionNote" type="textarea" :rows="2" placeholder="请填写纠正原因，将记录到评估留痕中" />
        </el-form-item>
      </div>

      <div style="margin-top: 16px">
        <el-button type="primary" :loading="loading" @click="onSubmit">保存评估</el-button>
        <el-button @click="$router.push('/assessments')">取消</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { elderApi } from '@/api/modules/elders'
import { assessmentApi } from '@/api/modules/assessments'
import {
  DIMENSIONS,
  ALL_ITEMS,
  ITEM_OPTIONS,
  LEVELS,
  DIMENSION_LEVELS,
  computeDimensionLevel,
  computeOverallLevel,
} from '@/constants/scoring'

const route = useRoute()
const router = useRouter()

const elders = ref([])
const elderId = ref(null)
const loading = ref(false)

// 每个二级指标的得分（0/1/2）
const scores = reactive({})
ALL_ITEMS.forEach((it) => (scores[it.key] = 0))

const manualLevel = ref(null)
const correctionNote = ref('')

const dimensionResults = computed(() =>
  DIMENSIONS.map((dim) => {
    const total = dim.items.reduce((sum, it) => sum + (scores[it.key] ?? 0), 0)
    const level = computeDimensionLevel(dim.key, total)
    return { ...dim, total, level }
  })
)

const overallLevel = computed(() => {
  const lv = {}
  dimensionResults.value.forEach((d) => (lv[d.key] = d.level))
  return computeOverallLevel(lv)
})

const overallTagType = computed(() => ['success', 'info', 'warning', 'danger'][overallLevel.value] || 'info')

const mismatch = computed(() => {
  if (manualLevel.value === null) return false
  return manualLevel.value !== overallLevel.value
})

function onElderChange() {
  // 切换老人时重置评分
  ALL_ITEMS.forEach((it) => (scores[it.key] = 0))
  manualLevel.value = null
  correctionNote.value = ''
}

function applyComputed() {
  manualLevel.value = overallLevel.value
  correctionNote.value = ''
}

async function loadElders() {
  const data = await elderApi.list()
  elders.value = data.list
  if (route.query.elderId) {
    elderId.value = route.query.elderId
  }
}

async function onSubmit() {
  if (!elderId.value) {
    ElMessage.warning('请选择评估对象')
    return
  }
  if (manualLevel.value === null) {
    ElMessage.warning('请填写您的判断等级')
    return
  }
  if (mismatch.value && !correctionNote.value.trim()) {
    ElMessage.warning('与系统不一致时，请填写纠正说明')
    return
  }
  loading.value = true
  try {
    await assessmentApi.create({
      elderId: elderId.value,
      scores: { ...scores },
      dimensionLevels: Object.fromEntries(dimensionResults.value.map((d) => [d.key, d.level])),
      computedLevel: overallLevel.value,
      manualLevel: manualLevel.value,
      corrected: mismatch.value,
      correctionNote: correctionNote.value,
    })
    ElMessage.success('评估已保存')
    router.push('/assessments')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadElders)
</script>
