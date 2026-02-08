import client from './client'

export const sessionsApi = {
  getActive: () => client.get('/sessions/active').then((res) => res.data),
  getHistory: (limit = 10) =>
    client.get(`/sessions/history?limit=${limit}`).then((res) => res.data),
  kill: (id) => client.post(`/sessions/${id}/kill`).then((res) => res.data),
  getThoughts: (id, after) => {
    const params = after ? `?after=${encodeURIComponent(after)}` : ''
    return client.get(`/sessions/${id}/thoughts${params}`).then((res) => res.data)
  },
}
