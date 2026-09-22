import { defineStore } from 'pinia'
import { authApi } from '@/api/modules/auth'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('shineng_user') || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('shineng_token') || '',
    user: readUser(),
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    isAdmin: (s) => s.user?.role === 'admin',
  },
  actions: {
    setSession(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('shineng_token', token)
      localStorage.setItem('shineng_user', JSON.stringify(user))
    },
    async login(payload) {
      const data = await authApi.login(payload)
      this.setSession(data.token, data.user)
      return data
    },
    async register(payload) {
      const data = await authApi.register(payload)
      this.setSession(data.token, data.user)
      return data
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('shineng_token')
      localStorage.removeItem('shineng_user')
    },
  },
})
