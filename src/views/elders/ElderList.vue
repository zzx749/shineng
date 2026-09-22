<template>
  <div>
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索姓名 / 身份证 / 电话"
        clearable
        style="width: 280px"
        :prefix-icon="Search"
        @input="load"
        @keyup.enter="load"
      />
      <el-button type="primary" :icon="Plus" @click="$router.push('/elders/new')">新增老人</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="gender" label="性别" width="70" />
      <el-table-column prop="age" label="年龄" width="70" />
      <el-table-column prop="idCard" label="身份证号" min-width="170" />
      <el-table-column prop="address" label="地址" min-width="160" show-overflow-tooltip />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="childrenPhone" label="儿女电话" width="130" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="$router.push(`/elders/${row.id}/edit`)">编辑</el-button>
          <el-button size="small" type="primary" @click="goAssess(row)">评估</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { elderApi } from '@/api/modules/elders'

const router = useRouter()
const list = ref([])
const loading = ref(false)
const keyword = ref('')

async function load() {
  loading.value = true
  try {
    const data = await elderApi.list({ keyword: keyword.value })
    list.value = data.list
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function goAssess(row) {
  router.push({ path: '/assessments/new', query: { elderId: row.id } })
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除老人「${row.name}」？其评估记录也会一并删除。`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await elderApi.remove(row.id)
    ElMessage.success('删除成功')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>
