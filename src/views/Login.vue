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
      <p class="auth-sub">登录</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
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
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button type="primary" class="auth-btn" :loading="loading" @click="onSubmit">登 录</el-button>
        <div class="auth-links">
          <router-link to="/register">没有账号？去注册</router-link>
        </div>
        <el-alert
          class="auth-hint"
          type="info"
          :closable="false"
          title="演示账号"
          description="管理员 admin / admin123 · 评估员 staff / staff123"
        />
      </el-form>
    </el-card>

    <WelcomeOverlay :visible="success" :subtitle="`欢迎回来，${welcomeUser}`" />
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
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
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
</script>
