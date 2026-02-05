import client from './client'

export const plansApi = {
  getByTask: (taskId) => client.get(`/plans/${taskId}`).then((res) => res.data),
  requestPlanning: (taskId, payload = {}) =>
    client.post(`/plans/${taskId}/planning`, payload).then((res) => res.data),
  execute: (taskId, payload = {}) =>
    client.post(`/plans/${taskId}/execute`, payload).then((res) => res.data),
  approve: (taskId) => client.put(`/plans/${taskId}/approve`).then((res) => res.data),
}
