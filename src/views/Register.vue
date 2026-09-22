<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <div class="auth-logo">
        <svg viewBox="0 0 24 24" width="30" height="30">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="#ffffff" />
          <path d="M12 8v8M8 12h8" stroke="#1890ff" stroke-width="2.2" stroke-linecap="round" />
        </svg>
      </div>
      <h2 class="auth-title">失能评估辅助系统</h2>
      <p class="auth-sub">注册（评估员账号）</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input
            v-model="form.confirm"
            type="password"
            show-password
            placeholder="请再次输入密码"
            :prefix-icon="Lock"
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button type="primary" class="auth-btn" :loading="loading" @click="onSubmit">注 册</el-button>
        <div class="auth-links">
          <router-link to="/login">已有账号？去登录</router-link>
        </div>
      </el-form>
    </el-card>

    <WelcomeOverlay :visible="success" title="注册成功" :subtitle="`欢迎加入，${form.name}`" />
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import WelcomeOverlay from '@/components/WelcomeOverlay.vue'

const router = useRouter()
const auth = useAuthStore()

const formRef = ref()
const loading = ref(false)
const success = ref(false)
const form = reactive({ name: '', username: '', password: '', confirm: '' })

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) callback(new Error('两次密码不一致'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

async function onSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    await auth.register({ name: form.name, username: form.username, password: form.password })
    success.value = true
    setTimeout(() => {
      success.value = false
    }, 750)
    setTimeout(() => {
      router.push('/')
    }, 1050)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
</script>
