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
          <p class="brand-note">注册评估员账号</p>
        </div>

        <el-form ref="formRef" class="auth-form" :model="form" :rules="rules" label-position="top">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" placeholder="请输入姓名">
              <template #prefix>
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.4" />
                  <path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                </svg>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名">
              <template #prefix>
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="14" rx="2.6" />
                  <circle cx="8.6" cy="11" r="1.8" />
                  <path d="M6.6 15.4c0-1.2 1-2 2-2s2 .8 2 2" />
                  <path d="M13.5 10h4M13.5 13.5h4" />
                </svg>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" show-password placeholder="请输入密码（至少 6 位）">
              <template #prefix>
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" />
                  <path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
                </svg>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="确认密码" prop="confirm">
            <el-input
              v-model="form.confirm"
              type="password"
              show-password
              placeholder="请再次输入密码"
              @keyup.enter="onSubmit"
            >
              <template #prefix>
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 3.5l7 2.6v5c0 4.2-2.9 7.4-7 9.4-4.1-2-7-5.2-7-9.4v-5l7-2.6z" />
                  <path d="M9 12l2.2 2.2L15.5 10" />
                </svg>
              </template>
            </el-input>
          </el-form-item>

          <el-button type="primary" class="auth-btn" :loading="loading" @click="onSubmit">注 册</el-button>

          <div class="auth-links">
            已有账号？
            <router-link to="/login">去登录</router-link>
          </div>
        </el-form>
      </el-card>
    </div>

    <WelcomeOverlay :visible="success" title="注册成功" :subtitle="`欢迎加入，${form.name}`" />
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElNotification } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import AuthBackground from '@/components/AuthBackground.vue'
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
    ElNotification.error({ title: '注册失败', message: e.message })
  } finally {
    loading.value = false
  }
}
</script>
