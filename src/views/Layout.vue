<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <div class="logo-mark">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect x="22.6" y="11" width="2.8" height="26" rx="1.4" fill="#ffffff" />
            <path d="M12 24h7.6l2.8-5 3.2 10 2.8-5H36" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <span class="logo-text">失能评估辅助系统</span>
      </div>

      <el-menu :default-active="activeMenu" router class="side-menu">
        <el-menu-item index="/elders">
          <el-icon><User /></el-icon>
          <span>老人管理</span>
        </el-menu-item>
        <el-menu-item index="/assessments">
          <el-icon><Document /></el-icon>
          <span>评估管理</span>
        </el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/admin/users">
          <el-icon><Setting /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <span class="crumb">首页</span>
          <template v-for="(item, i) in breadcrumb" :key="i">
            <span class="crumb-sep">/</span>
            <span class="crumb" :class="{ 'crumb-current': i === breadcrumb.length - 1 }">{{ item }}</span>
          </template>
        </div>
        <div class="header-right">
          <span class="role-tag" :class="auth.isAdmin ? 'role-tag--admin' : 'role-tag--staff'">
            {{ auth.isAdmin ? '管理员' : '评估员' }}
          </span>
          <el-dropdown @command="onCommand">
            <span class="user-name">
              <span class="user-avatar">{{ avatarChar }}</span>
              <span class="user-text">{{ auth.user?.name || auth.user?.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const activeMenu = computed(() => '/' + route.path.split('/')[1])

const avatarChar = computed(() => {
  const name = (auth.user?.name || auth.user?.username || '评').trim()
  return name.charAt(name.length - 1)
})

const breadcrumb = computed(() => {
  const path = route.path
  if (path.startsWith('/elders')) {
    if (path.endsWith('/new')) return ['老人管理', '新增老人']
    if (path !== '/elders') return ['老人管理', '编辑老人']
    return ['老人管理']
  }
  if (path.startsWith('/assessments')) {
    if (path.endsWith('/new')) return ['评估管理', '发起评估']
    if (path.includes('/report')) return ['评估管理', '评估报告']
    return ['评估管理']
  }
  if (path.startsWith('/admin')) return ['用户管理']
  return []
})

function onCommand(cmd) {
  if (cmd === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>
