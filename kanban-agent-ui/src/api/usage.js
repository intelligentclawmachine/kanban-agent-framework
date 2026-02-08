import client from './client'

export const usageApi = {
  getProviders: () => client.get('/usage/providers').then((res) => res.data),
  getSummary: () => client.get('/usage/summary').then((res) => res.data),
  getGlobalSessions: () => client.get('/usage/global-sessions').then((res) => res.data),
}
