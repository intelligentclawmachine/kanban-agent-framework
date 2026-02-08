import { useQuery } from '@tanstack/react-query'
import { usageApi } from '../api/usage'

export function useUsageProviders() {
  return useQuery({
    queryKey: ['usage', 'providers'],
    queryFn: usageApi.getProviders,
  })
}

export function useUsageSummary() {
  return useQuery({
    queryKey: ['usage', 'summary'],
    queryFn: usageApi.getSummary,
  })
}

export function useGlobalSessions() {
  return useQuery({
    queryKey: ['usage', 'global-sessions'],
    queryFn: usageApi.getGlobalSessions,
    staleTime: 5 * 60 * 1000,
  })
}
