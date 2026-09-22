import http from '@/api/http'

export const assessmentApi = {
  list: (params) => http.get('/assessments', { params }),
  get: (id) => http.get(`/assessments/${id}`),
  create: (payload) => http.post('/assessments', payload),
  report: (id) => http.get(`/reports/${id}`),
}
