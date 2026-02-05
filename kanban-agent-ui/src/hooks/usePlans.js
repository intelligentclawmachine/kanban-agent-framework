import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { plansApi } from '../api/plans'

export function usePlan(taskId) {
  return useQuery({
    queryKey: ['plans', taskId],
    queryFn: () => plansApi.getByTask(taskId),
    enabled: Boolean(taskId),
  })
}

export function useStartPlanning() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId) => plansApi.requestPlanning(taskId),
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['plans', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

export function useExecutePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId) => plansApi.execute(taskId),
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['plans', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

export function useApprovePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId) => plansApi.approve(taskId),
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['plans', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
