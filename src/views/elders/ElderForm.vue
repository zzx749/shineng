<template>
  <el-card>
    <template #header>{{ isEdit ? '编辑老人' : '新增老人' }}</template>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" class="elder-form">
      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.name" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="身份证号" prop="idCard">
        <el-input v-model="form.idCard" placeholder="输入 18 位身份证号后自动推算年龄与性别" @blur="autoFill" />
      </el-form-item>
      <el-form-item label="性别" prop="gender">
        <el-radio-group v-model="form.gender">
          <el-radio value="男">男</el-radio>
          <el-radio value="女">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="年龄" prop="age">
        <el-input-number v-model="form.age" :min="0" :max="150" />
      </el-form-item>
      <el-form-item label="地址" prop="address">
        <el-input v-model="form.address" placeholder="请输入家庭住址" />
      </el-form-item>
      <el-form-item label="电话" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入联系电话" />
      </el-form-item>
      <el-form-item label="儿女电话" prop="childrenPhone">
        <el-input v-model="form.childrenPhone" placeholder="请输入紧急联系（儿女）电话" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSubmit">保存</el-button>
        <el-button @click="$router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { elderApi } from '@/api/modules/elders'
import { parseIdCard } from '@/utils/idCard'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const formRef = ref()
const loading = ref(false)
const form = reactive({
  name: '',
  gender: '男',
  age: null,
  idCard: '',
  address: '',
  phone: '',
  childrenPhone: '',
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  idCard: [
    {
      validator: (rule, value, callback) => {
        if (value && !parseIdCard(value)) callback(new Error('身份证号格式不正确'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

function autoFill() {
  const info = parseIdCard(form.idCard)
  if (info) {
    form.age = info.age
    form.gender = info.gender
  }
}

async function load() {
  if (!isEdit.value) return
  const data = await elderApi.get(route.params.id)
  Object.assign(form, {
    name: data.name,
    gender: data.gender,
    age: data.age,
    idCard: data.idCard,
    address: data.address,
    phone: data.phone,
    childrenPhone: data.childrenPhone,
  })
}

async function onSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    if (isEdit.value) {
      await elderApi.update(route.params.id, { ...form })
      ElMessage.success('保存成功')
    } else {
      await elderApi.create({ ...form })
      ElMessage.success('新增成功')
    }
    router.push('/elders')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
