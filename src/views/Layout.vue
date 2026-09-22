<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">失能评估辅助系统</div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#001529"
        text-color="#c8c9cc"
        active-text-color="#ffffff"
      >
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
        <div class="header-right">
          <el-tag :type="auth.isAdmin ? 'danger' : 'primary'" size="small">
            {{ auth.isAdmin ? '管理员' : '评估员' }}
          </el-tag>
          <el-dropdown @command="onCommand">
            <span class="user-name">
              {{ auth.user?.name || auth.user?.username }}
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

function onCommand(cmd) {
  if (cmd === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>
