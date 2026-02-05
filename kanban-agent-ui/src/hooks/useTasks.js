import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'

export function useTasks(filters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.getAll(filters),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }) => tasksApi.update(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'] })

      queryClient.setQueriesData({ queryKey: ['tasks'] }, (oldData) => {
        if (!oldData?.tasks) return oldData
        return {
          ...oldData,
          tasks: oldData.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)),
        }
      })

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      context?.previousTasks?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useMoveTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }) => tasksApi.move(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'] })

      queryClient.setQueriesData({ queryKey: ['tasks'] }, (oldData) => {
        if (!oldData?.tasks) return oldData
        return {
          ...oldData,
          tasks: oldData.tasks.map((task) => (task.id === id ? { ...task, status } : task)),
        }
      })

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      context?.previousTasks?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
