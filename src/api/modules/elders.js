import http from '@/api/http'
import { elderFromApi, elderToApi } from '@/api/mappers'

export const elderApi = {
  list: async (params) => {
    const data = await http.get('/elders', { params })
    return { ...data, list: data.list.map(elderFromApi) }
  },
  get: async (id) => elderFromApi(await http.get(`/elders/${id}`)),
  create: async (payload) => elderFromApi(await http.post('/elders', elderToApi(payload))),
  update: async (id, payload) => elderFromApi(await http.put(`/elders/${id}`, elderToApi(payload))),
  remove: (id) => http.delete(`/elders/${id}`),
}
