<template>
  <div class="page">
    <div class="page-head no-print">
      <h2 class="page-title">评估报告</h2>
      <p class="page-sub">查看评估结论，可打印或导出 PDF 归档</p>
    </div>

    <div class="toolbar no-print">
      <el-button @click="$router.back()">返回</el-button>
      <div>
        <el-button :icon="Printer" @click="print">打印</el-button>
        <el-button type="primary" :icon="Download" :loading="exporting" @click="exportPdf">导出 PDF</el-button>
      </div>
    </div>

    <div v-if="assessment" class="print-area" v-loading="loading">
      <h2 style="text-align: center; margin: 0 0 4px">老年人能力评估报告</h2>
      <p style="text-align: center; color: #6b7683; margin: 0 0 20px">依据 GB/T 42195-2022《老年人能力评估规范》</p>

      <el-descriptions title="一、老人基本信息" :column="2" border>
        <el-descriptions-item label="姓名">{{ elder?.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ elder?.gender }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ elder?.age }}</el-descriptions-item>
        <el-descriptions-item label="身份证号">{{ elder?.idCard }}</el-descriptions-item>
        <el-descriptions-item label="地址" :span="2">{{ elder?.address }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ elder?.phone }}</el-descriptions-item>
        <el-descriptions-item label="儿女电话">{{ elder?.childrenPhone }}</el-descriptions-item>
      </el-descriptions>

      <div class="report-section" style="margin-top: 20px">
        <h3 class="report-section-title">二、各维度评估结果（二十六项得分明细）</h3>
        <table class="score-table">
          <thead>
            <tr>
              <th class="col-item">评估项目</th>
              <th class="col-score">得分</th>
              <th class="col-criteria">评分标准说明</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="dim in dimRows" :key="dim.key">
              <tr class="score-dim">
                <td colspan="3">{{ dim.name }}　小计 {{ dim.total }} 分</td>
              </tr>
              <tr v-for="item in dim.items" :key="item.key">
                <td class="col-item">{{ item.name }}</td>
                <td class="col-score">{{ item.score }} / {{ item.max }} 分</td>
                <td class="col-criteria">{{ criteriaText(item.key, item.score) }}</td>
              </tr>
            </template>
            <tr class="score-dim">
              <td>总分</td>
              <td class="col-score">{{ totalScore }} / 90 分</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="report-section" style="margin-top: 20px">
        <h3 class="report-section-title">三、图表分析</h3>
        <div class="chart-grid">
          <div class="chart-cell">
            <h4 class="chart-title">能力雷达图（得分率 %）</h4>
            <EChart :option="radarOption" height="280px" />
          </div>
          <div class="chart-cell">
            <h4 class="chart-title">维度得分对比</h4>
            <EChart :option="dimBarOption" height="280px" />
          </div>
        </div>
        <div class="chart-cell" style="margin-top: 16px">
          <h4 class="chart-title">逐项能力曲线（得分率 %）</h4>
          <EChart :option="itemLineOption" height="320px" />
        </div>
      </div>

      <el-descriptions title="四、评估结论" :column="1" border style="margin-top: 20px">
        <el-descriptions-item label="系统自动评定">
          <span class="level-badge" :style="badgeStyle(assessment.computedLevel)">{{ LEVELS[assessment.computedLevel] }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="最终等级">
          <span class="level-badge" :style="badgeStyle(assessment.manualLevel)">{{ LEVELS[assessment.manualLevel] }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="assessment.corrected" label="纠正说明">
          {{ assessment.correctionNote || '（无）' }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="qa" class="report-section" style="margin-top: 20px">
        <h3 class="report-section-title">五、问答观察记录</h3>
        <img v-if="qa.photo" :src="qa.photo" class="qa-photo" alt="问答观察快照" />
        <table class="score-table" style="margin-top: 12px">
          <thead>
            <tr>
              <th class="col-item">观察项目</th>
              <th class="col-item">提问 / 观察点</th>
              <th class="col-score">回答</th>
              <th class="col-item">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(q, i) in qa.questions" :key="q.key || i">
              <td class="col-item">{{ q.item || q.key }}</td>
              <td class="col-item">{{ q.question }}</td>
              <td class="col-score">{{ qaAnswerLabel(q.answer) }}</td>
              <td class="col-item">{{ q.note || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p class="qa-summary">{{ qa.summary }}</p>
      </div>

      <p style="margin-top: 24px; text-align: right; color: #6b7683">
        评估人：{{ assessment.assessor }} · 评估日期：{{ assessment.date }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Printer, Download } from '@element-plus/icons-vue'
import { assessmentApi } from '@/api/modules/assessments'
import { exportElementToPdf } from '@/utils/pdf'
import { DIMENSIONS, ALL_ITEMS, LEVELS, computeTotalScore } from '@/constants/scoring'
import { criteriaText } from '@/constants/criteria'
import { QA_OPTIONS } from '@/constants/qa'
import EChart from '@/components/EChart.vue'

const route = useRoute()
const assessment = ref(null)
const elder = ref(null)
const loading = ref(false)
const exporting = ref(false)

// 报告中的维度展示：维度名称 + 小计得分 + 各二级指标得分明细（26 项）
const dimRows = computed(() => {
  if (!assessment.value) return []
  const s = assessment.value.scores || {}
  return DIMENSIONS.map((dim) => {
    const items = dim.items.map((it) => ({ ...it, score: s[it.key] ?? 0 }))
    const total = items.reduce((sum, it) => sum + it.score, 0)
    const full = items.reduce((sum, it) => sum + it.max, 0)
    return { key: dim.key, name: dim.name, total, full, percent: full ? Math.round((total / full) * 100) : 0, items }
  })
})

const totalScore = computed(() => {
  if (!assessment.value) return 0
  return computeTotalScore(assessment.value.scores)
})

// ---- 图表分析 ----
// 逐项得分（得分率 %，用于能力曲线）
const itemProfile = computed(() => {
  if (!assessment.value) return []
  const s = assessment.value.scores || {}
  return ALL_ITEMS.map((it) => {
    const score = s[it.key] ?? 0
    return { name: it.name, score, max: it.max, percent: it.max ? Math.round((score / it.max) * 100) : 0 }
  })
})

// 能力雷达图：4 个一级指标得分率（%）
const radarOption = computed(() => {
  const dims = dimRows.value
  return {
    animation: false,
    tooltip: { trigger: 'item' },
    radar: {
      indicator: dims.map((d) => ({ name: d.name, max: 100 })),
      radius: '62%',
      axisName: { color: '#4b5563', fontSize: 12 },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: dims.map((d) => d.percent),
            name: '能力得分率',
            areaStyle: { color: 'rgba(86,159,122,0.25)' },
            lineStyle: { color: '#569f7a', width: 2 },
            itemStyle: { color: '#569f7a' },
          },
        ],
      },
    ],
  }
})

// 维度得分柱状图：小计 vs 满分
const dimBarOption = computed(() => {
  const dims = dimRows.value
  return {
    animation: false,
    tooltip: { trigger: 'axis' },
    legend: { data: ['得分', '满分'], top: 0 },
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: dims.map((d) => d.name), axisLabel: { interval: 0 } },
    yAxis: { type: 'value' },
    series: [
      { name: '得分', type: 'bar', data: dims.map((d) => d.total), barMaxWidth: 28, itemStyle: { color: '#569f7a', borderRadius: [4, 4, 0, 0] } },
      { name: '满分', type: 'bar', data: dims.map((d) => d.full), barMaxWidth: 28, itemStyle: { color: '#dfe7ee', borderRadius: [4, 4, 0, 0] } },
    ],
  }
})

// 逐项能力曲线：26 项得分率（%）
const itemLineOption = computed(() => {
  const items = itemProfile.value
  return {
    animation: false,
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: items.map((i) => i.name),
      axisLabel: { interval: 0, rotate: 45, fontSize: 10, color: '#6b7280' },
    },
    yAxis: { type: 'value', max: 100, name: '得分率%' },
    series: [
      {
        type: 'line',
        data: items.map((i) => i.percent),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#56a2a8', width: 2 },
        itemStyle: { color: '#56a2a8' },
        areaStyle: { color: 'rgba(86,162,168,0.12)' },
      },
    ],
  }
})

// 问答观察记录（仅当评估含 qa 且有内容时展示）
const qa = computed(() => {
  const q = assessment.value?.qa
  if (!q || typeof q !== 'object') return null
  const hasContent = q.photo || (Array.isArray(q.questions) && q.questions.length) || q.summary
  return hasContent ? q : null
})

function qaAnswerLabel(answer) {
  if (answer === null || answer === undefined || answer === '') return '未记录'
  return QA_OPTIONS.find((o) => o.value === answer)?.label || String(answer)
}

// 结论徽章样式：按 5 个能力等级着色（浅色背景 + 深色文字 + 边框），
// 用普通 span 替代 el-tag 以避免 html2canvas 对 inline-flex 居中标签的文字裁切。
const LEVEL_BADGE_STYLES = [
  { background: '#edf4ef', color: '#447f61', borderColor: '#d9e8de' }, // 0 能力完好
  { background: '#eff1f3', color: '#626b76', borderColor: '#e0e4e8' }, // 1 轻度失能
  { background: '#fcf3e6', color: '#b37d37', borderColor: '#f8e6cd' }, // 2 中度失能
  { background: '#faecec', color: '#a85555', borderColor: '#f3d8d8' }, // 3 重度失能
  { background: '#f6e0e0', color: '#8e3b3b', borderColor: '#e3b8b8' }, // 4 完全失能
]

function badgeStyle(level) {
  return LEVEL_BADGE_STYLES[level] || LEVEL_BADGE_STYLES[1]
}

function print() {
  window.print()
}

async function exportPdf() {
  const el = document.querySelector('.print-area')
  if (!el) return
  exporting.value = true
  try {
    const name = elder.value?.name || '评估对象'
    const date = assessment.value?.date || ''
    await exportElementToPdf(el, `评估报告-${name}-${date}.pdf`)
  } catch (e) {
    ElMessage.error('导出失败：' + (e.message || '未知错误'))
  } finally {
    exporting.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const data = await assessmentApi.report(route.params.id)
    assessment.value = data.assessment
    elder.value = data.elder
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
