import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionsApi } from '../api/sessions'

export function useActiveSessions() {
  return useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: sessionsApi.getActive,
  })
}

export function useSessionHistory(limit = 10) {
  return useQuery({
    queryKey: ['sessions', 'history', limit],
    queryFn: () => sessionsApi.getHistory(limit),
  })
}

export function useKillSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sessionsApi.kill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useSessionThoughts(sessionId, enabled = true) {
  return useQuery({
    queryKey: ['sessions', 'thoughts', sessionId],
    queryFn: () => sessionsApi.getThoughts(sessionId),
    enabled: !!sessionId && enabled,
    refetchInterval: 3000,
    staleTime: 2000,
  })
}
