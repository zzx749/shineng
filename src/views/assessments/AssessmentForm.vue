<template>
  <div class="page">
    <div class="page-head">
      <h2 class="page-title">发起评估</h2>
      <p class="page-sub">按 GB/T 42195-2022 对老年人进行能力评估，系统将自动计算等级并与您的判断比对</p>
    </div>

    <div class="page-card">
      <el-form label-width="100px">
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

      <el-divider content-position="left">评分指标（共 26 项 · 总分 0~90，得分越高能力越好 · 点击标准说明即可打分）</el-divider>
      <div class="assess-total-bar">
        <div>
          总分 <b class="assess-total">{{ totalScore }}</b> / 90 分
          <span class="assess-progress">已评 {{ assessedCount }}/{{ ALL_ITEMS.length }} 项</span>
        </div>
        <el-tag v-if="complete" :type="overallTagType">{{ LEVELS[overallLevel] }}</el-tag>
        <el-tag v-else type="info">请完成全部指标评分</el-tag>
      </div>

      <div v-for="dim in DIMENSIONS" :key="dim.key" class="assess-dim">
        <div class="assess-dim-title">
          {{ dim.name }}
          <span class="assess-dim-sub">小计 {{ dimensionScores[dim.key] }} 分</span>
        </div>
        <div
          v-for="item in dim.items"
          :key="item.key"
          class="assess-item"
          :class="'rank-' + scoreRank(item.max, scores[item.key])"
        >
          <div class="assess-item-row">
            <span class="assess-item-name">{{ item.name }}</span>
            <span
              v-if="scores[item.key] !== null"
              class="assess-item-value"
              :class="'rank-' + scoreRank(item.max, scores[item.key])"
            >
              {{ scores[item.key] }} 分
            </span>
            <span v-else class="assess-item-value assess-item-unrated">未评</span>
          </div>
          <div class="assess-item-criteria">
            <span
              v-for="v in optionsFor(item.max)"
              :key="v"
              class="criteria-chip"
              :class="['rank-' + scoreRank(item.max, v), { 'is-active': scores[item.key] === v }]"
              @click="setScore(item.key, v)"
            >
              <b class="criteria-chip-score">{{ v }} 分</b>
              <span class="criteria-chip-text">{{ criteriaText(item.key, v) }}</span>
            </span>
          </div>
        </div>
      </div>

      <el-divider content-position="left">问答观察（摄像头留档 · 固定问答）</el-divider>
      <div class="qa-section">
        <el-checkbox v-model="consented">已征得老人/家属同意进行拍摄（仅存一张快照，不录视频）</el-checkbox>

        <div class="qa-camera">
          <div class="qa-camera-btns">
            <el-button v-if="!cameraOn" type="primary" plain :disabled="!consented" @click="startCamera">开启摄像头</el-button>
            <template v-else>
              <el-button @click="stopCamera">关闭摄像头</el-button>
              <el-button type="primary" @click="capture">拍照</el-button>
              <el-button v-if="qaPhoto" @click="qaPhoto = null">重拍</el-button>
            </template>
          </div>
          <video v-show="cameraOn" ref="videoRef" autoplay playsinline muted class="qa-video"></video>
          <img v-if="qaPhoto" :src="qaPhoto" class="qa-photo-preview" alt="问答观察快照" />
        </div>

        <div v-for="q in QA_QUESTIONS" :key="q.key" class="qa-item">
          <div class="qa-item-main">
            <div class="qa-item-q">
              <span class="qa-item-item">{{ q.item }}</span>
              <span class="qa-item-question">{{ q.question }}</span>
            </div>
            <el-radio-group v-model="qaAnswers[q.key]" size="small">
              <el-radio-button v-for="opt in QA_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</el-radio-button>
            </el-radio-group>
          </div>
          <el-input v-model="qaNotes[q.key]" class="qa-item-note" placeholder="备注（可选）" size="small" />
        </div>
      </div>

      <el-divider content-position="left">等级判定</el-divider>
      <div class="assess-summary">
        <el-descriptions :column="1" border style="max-width: 720px">
          <el-descriptions-item label="系统自动评定">
            <el-tag v-if="complete" :type="overallTagType">{{ LEVELS[overallLevel] }}</el-tag>
            <span v-else class="table-muted">完成全部指标后自动计算</span>
          </el-descriptions-item>
          <el-descriptions-item label="您的判断等级">
            <el-radio-group v-model="manualLevel" class="level-radio-group">
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
        <el-button type="primary" :loading="loading" :disabled="!complete" @click="onSubmit">保存评估</el-button>
        <el-button @click="$router.push('/assessments')">取消</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { elderApi } from '@/api/modules/elders'
import { assessmentApi } from '@/api/modules/assessments'
import {
  DIMENSIONS,
  ALL_ITEMS,
  LEVELS,
  optionsFor,
  scoreRank,
  computeTotalScore,
  computeDimensionScores,
  computeOverallLevel,
} from '@/constants/scoring'
import { criteriaText } from '@/constants/criteria'
import { QA_OPTIONS, QA_QUESTIONS, buildQaSummary } from '@/constants/qa'

const route = useRoute()
const router = useRouter()

const elders = ref([])
const elderId = ref(null)
const loading = ref(false)

// 每个二级指标的得分（初始 null=未评；高分=能力好）
const scores = reactive({})
ALL_ITEMS.forEach((it) => (scores[it.key] = null))

const manualLevel = ref(null)
const correctionNote = ref('')

// 问答观察：摄像头 + 固定题目（仅作观察留档，不写入评分）
const consented = ref(false)
const cameraOn = ref(false)
const videoRef = ref(null)
const qaPhoto = ref(null)
let stream = null
const qaAnswers = reactive({})
const qaNotes = reactive({})
QA_QUESTIONS.forEach((q) => {
  qaAnswers[q.key] = null
  qaNotes[q.key] = ''
})

const dimensionScores = computed(() => computeDimensionScores(scores))
const totalScore = computed(() => computeTotalScore(scores))
const assessedCount = computed(() => ALL_ITEMS.filter((it) => scores[it.key] !== null).length)
const complete = computed(() => assessedCount.value === ALL_ITEMS.length)

const overallLevel = computed(() => (complete.value ? computeOverallLevel(scores) : null))

const overallTagType = computed(() => {
  const lv = overallLevel.value
  if (lv === null) return 'info'
  return ['success', 'info', 'warning', 'danger', 'danger'][lv] || 'info'
})

const mismatch = computed(() => {
  if (!complete.value) return false
  if (manualLevel.value === null) return false
  return manualLevel.value !== overallLevel.value
})

function onElderChange() {
  // 切换老人时重置评分
  ALL_ITEMS.forEach((it) => (scores[it.key] = null))
  manualLevel.value = null
  correctionNote.value = ''
  QA_QUESTIONS.forEach((q) => {
    qaAnswers[q.key] = null
    qaNotes[q.key] = ''
  })
  qaPhoto.value = null
}

function applyComputed() {
  manualLevel.value = overallLevel.value
  correctionNote.value = ''
}

// 点击标准说明即打分（再点一次取消，回到未评）
function setScore(key, value) {
  scores[key] = scores[key] === value ? null : value
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    })
    cameraOn.value = true
    await nextTick()
    if (videoRef.value) videoRef.value.srcObject = stream
  } catch (e) {
    ElMessage.error('无法开启摄像头：' + (e.message || '请检查权限或设备'))
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    stream = null
  }
  cameraOn.value = false
}

function capture() {
  const video = videoRef.value
  if (!video || !video.videoWidth) {
    ElMessage.warning('摄像头尚未就绪')
    return
  }
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  qaPhoto.value = canvas.toDataURL('image/jpeg', 0.6)
  ElMessage.success('快照已保存，可继续问答或重拍')
}

async function loadElders() {
  const data = await elderApi.list()
  elders.value = data.list
  if (route.query.elderId) {
    elderId.value = Number(route.query.elderId)
  }
}

async function onSubmit() {
  if (!elderId.value) {
    ElMessage.warning('请选择评估对象')
    return
  }
  if (!complete.value) {
    ElMessage.warning(`还有 ${ALL_ITEMS.length - assessedCount.value} 项指标未评分`)
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
    const qaQuestions = QA_QUESTIONS.map((q) => ({
      key: q.key,
      item: q.item,
      question: q.question,
      answer: qaAnswers[q.key],
      note: qaNotes[q.key] || '',
    }))
    const hasQa = !!qaPhoto.value || qaQuestions.some((q) => q.answer !== null)
    const qa = hasQa
      ? { photo: qaPhoto.value, questions: qaQuestions, summary: buildQaSummary(qaQuestions) }
      : undefined

    await assessmentApi.create({
      elderId: elderId.value,
      scores: { ...scores },
      computedLevel: overallLevel.value,
      manualLevel: manualLevel.value,
      correctionNote: correctionNote.value,
      ...(qa ? { qa } : {}),
    })
    ElMessage.success('评估已保存')
    router.push('/assessments')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(stopCamera)
onMounted(loadElders)
</script>
