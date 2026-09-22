<template>
  <div>
    <div class="toolbar no-print">
      <el-button @click="$router.back()">返回</el-button>
      <div>
        <el-button :icon="Printer" @click="print">打印</el-button>
        <el-button type="primary" :icon="Download" :loading="exporting" @click="exportPdf">导出 PDF</el-button>
      </div>
    </div>

    <div v-if="assessment" class="print-area" v-loading="loading">
      <h2 style="text-align: center; margin: 0 0 4px">老年人能力评估报告</h2>
      <p style="text-align: center; color: #909399; margin: 0 0 20px">依据 GB/T 42195-2022《老年人能力评估规范》</p>

      <el-descriptions title="一、老人基本信息" :column="2" border>
        <el-descriptions-item label="姓名">{{ elder?.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ elder?.gender }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ elder?.age }}</el-descriptions-item>
        <el-descriptions-item label="身份证号">{{ elder?.idCard }}</el-descriptions-item>
        <el-descriptions-item label="地址" :span="2">{{ elder?.address }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ elder?.phone }}</el-descriptions-item>
        <el-descriptions-item label="儿女电话">{{ elder?.childrenPhone }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions title="二、各维度评估结果" :column="2" border style="margin-top: 20px">
        <template v-for="dim in dimRows" :key="dim.key">
          <el-descriptions-item :label="dim.name">{{ dim.total }} 分（{{ DIMENSION_LEVELS[dim.level] }}）</el-descriptions-item>
        </template>
      </el-descriptions>

      <el-descriptions title="三、评估结论" :column="1" border style="margin-top: 20px">
        <el-descriptions-item label="系统自动评定">
          <el-tag :type="tagType(assessment.computedLevel)">{{ LEVELS[assessment.computedLevel] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最终等级">
          <el-tag :type="tagType(assessment.manualLevel)">{{ LEVELS[assessment.manualLevel] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="assessment.corrected" label="纠正说明">
          {{ assessment.correctionNote || '（无）' }}
        </el-descriptions-item>
      </el-descriptions>

      <p style="margin-top: 24px; text-align: right">
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
import { DIMENSIONS, DIMENSION_LEVELS, LEVELS, computeDimensionLevel } from '@/constants/scoring'

const route = useRoute()
const assessment = ref(null)
const elder = ref(null)
const loading = ref(false)
const exporting = ref(false)

// 报告中的维度展示：维度名称 + 该项总分（从 scores 汇总）+ 等级
const dimRows = computed(() => {
  if (!assessment.value) return []
  const s = assessment.value.scores || {}
  return DIMENSIONS.map((dim) => {
    const total = dim.items.reduce((sum, it) => sum + (s[it.key] ?? 0), 0)
    const level = assessment.value.dimensionLevels?.[dim.key] ?? computeDimensionLevel(dim.key, total)
    return { key: dim.key, name: dim.name, total, level }
  })
})

function tagType(level) {
  return ['success', 'info', 'warning', 'danger'][level] || 'info'
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
