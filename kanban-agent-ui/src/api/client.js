import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use(
  (config) => {
    if (import.meta?.env?.MODE !== 'production') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    }
    return config
  },
  (error) => Promise.reject(error)
)

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta?.env?.MODE !== 'production') {
      console.error('[API Error]', error.response?.data || error.message)
    }
    return Promise.reject(error)
  }
)

export default client
