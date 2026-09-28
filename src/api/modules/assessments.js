import http from '@/api/http'
import { assessmentFromApi, assessmentToApi, elderFromApi } from '@/api/mappers'

export const assessmentApi = {
  list: async (params) => {
    const query = params ? { ...params } : {}
    if (query.elderId !== undefined) {
      query.elder_id = query.elderId
      delete query.elderId
    }
    const data = await http.get('/assessments', { params: query })
    return { ...data, list: data.list.map(assessmentFromApi) }
  },
  get: async (id) => assessmentFromApi(await http.get(`/assessments/${id}`)),
  create: async (payload) => assessmentFromApi(await http.post('/assessments', assessmentToApi(payload))),
  remove: (id) => http.delete(`/assessments/${id}`),
  report: async (id) => {
    const data = await http.get(`/reports/${id}`)
    return {
      assessment: assessmentFromApi(data.assessment),
      elder: elderFromApi(data.elder),
    }
  },
}
