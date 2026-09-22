import axios from 'axios'
import { mockAdapter } from './mock/adapter'

// 后端接口就绪后，把 USE_MOCK 改为 false 即可切换为真实接口
const USE_MOCK = true

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

if (USE_MOCK) {
  http.defaults.adapter = mockAdapter
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('shineng_token')
  if (token) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status
    const message = err.response?.data?.message || err.message || '请求失败'
    if (status === 401) {
      localStorage.removeItem('shineng_token')
      localStorage.removeItem('shineng_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(new Error(message))
  }
)

export default http
