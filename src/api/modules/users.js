import http from '@/api/http'

export const userApi = {
  list: () => http.get('/users'),
  update: (id, payload) => http.put(`/users/${id}`, payload),
  remove: (id) => http.delete(`/users/${id}`),
}
