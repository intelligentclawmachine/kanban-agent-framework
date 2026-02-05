import client from './client'

export const reportsApi = {
  getAll: () => client.get('/reports').then((res) => res.data),
  getById: (id) => client.get(`/reports/${id}`).then((res) => res.data),
}
