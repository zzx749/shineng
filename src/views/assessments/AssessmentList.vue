<template>
  <div class="page">
    <div class="page-head">
      <h2 class="page-title">评估管理</h2>
      <p class="page-sub">查看评估记录与等级判定结果</p>
    </div>

    <div class="page-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="toolbar-note">共 {{ list.length }} 条评估记录</span>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" :icon="Plus" @click="$router.push('/assessments/new')">发起评估</el-button>
        </div>
      </div>

      <el-table :data="rows" v-loading="loading">
        <el-table-column label="老人姓名" min-width="100">
          <template #default="{ row }">{{ row.elderName }}</template>
        </el-table-column>
        <el-table-column prop="date" label="评估日期" width="120" />
        <el-table-column label="系统评定" width="110">
          <template #default="{ row }">
            <el-tag :type="levelTagType(row.computedLevel)">{{ levelLabel(row.computedLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最终等级" width="110">
          <template #default="{ row }">
            <el-tag :type="levelTagType(row.manualLevel)">{{ levelLabel(row.manualLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="纠正" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.corrected" type="warning" size="small">已纠正</el-tag>
            <span v-else class="table-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="assessor" label="评估人" width="110" />
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="$router.push(`/assessments/${row.id}/report`)">
              查看报告
            </el-button>
            <el-button size="small" type="danger" link @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { assessmentApi } from '@/api/modules/assessments'
import { elderApi } from '@/api/modules/elders'
import { LEVELS } from '@/constants/scoring'

const list = ref([])
const elderMap = ref({})
const loading = ref(false)

const rows = computed(() =>
  list.value.map((a) => ({ ...a, elderName: elderMap.value[a.elderId] || '（已删除）' }))
)

function levelLabel(level) {
  return LEVELS[level] ?? '未知'
}

function levelTagType(level) {
  return ['success', 'info', 'warning', 'danger'][level] || 'info'
}

async function load() {
  loading.value = true
  try {
    const [assessData, elderData] = await Promise.all([
      assessmentApi.list(),
      elderApi.list(),
    ])
    list.value = assessData.list
    elderMap.value = Object.fromEntries(elderData.list.map((e) => [e.id, e.name]))
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${row.elderName}」于 ${row.date} 的评估记录？删除后不可恢复。`,
      '提示',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await assessmentApi.remove(row.id)
    ElMessage.success('删除成功')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>
