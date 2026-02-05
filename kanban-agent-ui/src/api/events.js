import client from './client'

export const eventsApi = {
  getAll: (limit = 50) => client.get(`/events?limit=${limit}`).then((res) => res.data),
}
