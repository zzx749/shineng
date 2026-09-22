<template>
  <div>
    <div class="toolbar">
      <span style="color: #909399">共 {{ list.length }} 条评估记录</span>
      <el-button type="primary" :icon="Plus" @click="$router.push('/assessments/new')">发起评估</el-button>
    </div>

    <el-table :data="rows" v-loading="loading" border stripe>
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
          <span v-else style="color: #c0c4cc">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="assessor" label="评估人" width="110" />
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="$router.push(`/assessments/${row.id}/report`)">
            查看报告
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
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

onMounted(load)
</script>
