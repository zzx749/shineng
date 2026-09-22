import http from '@/api/http'

export const elderApi = {
  list: (params) => http.get('/elders', { params }),
  get: (id) => http.get(`/elders/${id}`),
  create: (payload) => http.post('/elders', payload),
  update: (id, payload) => http.put(`/elders/${id}`, payload),
  remove: (id) => http.delete(`/elders/${id}`),
}
