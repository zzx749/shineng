<template>
  <div class="auth-page">
    <AuthBackground />

    <div class="auth-card-wrap">
      <el-card class="auth-card" shadow="never">
        <div class="brand">
          <div class="brand-logo">
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="22.6" y="11" width="2.8" height="26" rx="1.4" fill="#ffffff" />
              <path d="M12 24h7.6l2.8-5 3.2 10 2.8-5H36" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h1 class="brand-title">失能评估辅助系统</h1>
          <p class="brand-sub">Disability Assessment Assistance System</p>
        </div>

        <el-form ref="formRef" class="auth-form" :model="form" :rules="rules" label-position="top">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" clearable>
              <template #prefix>
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.4" />
                  <path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                </svg>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="请输入密码"
              @keyup.enter="onSubmit"
            >
              <template #prefix>
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" />
                  <path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
                </svg>
              </template>
            </el-input>
          </el-form-item>

          <el-button type="primary" class="auth-btn" :loading="loading" @click="onSubmit">登 录</el-button>

          <div class="auth-links">
            没有账号？
            <router-link to="/register">去注册</router-link>
          </div>
        </el-form>

        <div class="demo-card">
          <div class="demo-head">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3.5l7 2.6v5c0 4.2-2.9 7.4-7 9.4-4.1-2-7-5.2-7-9.4v-5l7-2.6z" />
            </svg>
            演示账号 · Demo Account
          </div>
          <div class="demo-list">
            <div class="demo-row">
              <span class="demo-role demo-role--admin">管理员</span>
              <div class="demo-right">
                <code>admin / admin123</code>
                <button type="button" class="demo-fill" @click="fillDemo('admin', 'admin123')">一键填入</button>
              </div>
            </div>
            <div class="demo-row">
              <span class="demo-role demo-role--staff">评估员</span>
              <div class="demo-right">
                <code>注册获取</code>
                <button type="button" class="demo-fill" @click="$router.push('/register')">去注册</button>
              </div>
            </div>
          </div>
          <p class="demo-tip">登录后即可体验系统完整评估流程</p>
        </div>
      </el-card>
    </div>

    <WelcomeOverlay :visible="success" :subtitle="`欢迎回来，${welcomeUser}`" />
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElNotification } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import AuthBackground from '@/components/AuthBackground.vue'
import WelcomeOverlay from '@/components/WelcomeOverlay.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const formRef = ref()
const loading = ref(false)
const success = ref(false)
const welcomeUser = ref('')
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function fillDemo(username, password) {
  form.username = username
  form.password = password
  formRef.value?.clearValidate()
}

async function onSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    await auth.login({ ...form })
    welcomeUser.value = auth.user?.name || auth.user?.username || ''
    success.value = true
    setTimeout(() => {
      success.value = false
    }, 750)
    setTimeout(() => {
      router.push(route.query.redirect || '/')
    }, 1050)
  } catch (e) {
    ElNotification.error({ title: '登录失败', message: e.message })
  } finally {
    loading.value = false
  }
}
</script>
