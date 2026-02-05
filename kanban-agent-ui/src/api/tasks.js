import client from './client'

export const tasksApi = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.priority) params.append('priority', filters.priority)
    if (filters.search) params.append('search', filters.search)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.offset) params.append('offset', filters.offset)
    const query = params.toString()
    const url = query ? `/tasks?${query}` : '/tasks'
    return client.get(url).then((res) => res.data)
  },
  create: (taskData) => client.post('/tasks', taskData).then((res) => res.data),
  update: (id, updates) =>
    client.patch(`/tasks/${id}`, updates).then((res) => res.data),
  delete: (id) => client.delete(`/tasks/${id}`).then((res) => res.data),
  move: (id, status) =>
    client.post(`/tasks/${id}/move`, { status }).then((res) => res.data),
}
