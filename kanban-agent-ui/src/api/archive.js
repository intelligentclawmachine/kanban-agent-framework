import client from './client'

export const archiveApi = {
  getAll: () => client.get('/archive').then((res) => res.data),
  restore: (taskId) => client.post(`/archive/${taskId}/restore`).then((res) => res.data),
  delete: (taskId) => client.delete(`/archive/${taskId}`).then((res) => res.data),
}
