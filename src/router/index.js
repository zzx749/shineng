import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/Register.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/elders',
    children: [
      { path: 'elders', name: 'elders', component: () => import('@/views/elders/ElderList.vue') },
      { path: 'elders/new', name: 'elder-new', component: () => import('@/views/elders/ElderForm.vue') },
      { path: 'elders/:id/edit', name: 'elder-edit', component: () => import('@/views/elders/ElderForm.vue') },
      { path: 'assessments', name: 'assessments', component: () => import('@/views/assessments/AssessmentList.vue') },
      { path: 'assessments/new', name: 'assessment-new', component: () => import('@/views/assessments/AssessmentForm.vue') },
      { path: 'assessments/:id/report', name: 'report', component: () => import('@/views/reports/Report.vue') },
      { path: 'admin/users', name: 'users', component: () => import('@/views/admin/UserList.vue'), meta: { roles: ['admin'] } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.isAuthenticated && (to.name === 'login' || to.name === 'register')) {
      return { path: '/' }
    }
    return true
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role)) {
    return { path: '/elders' }
  }
  return true
})

export default router
