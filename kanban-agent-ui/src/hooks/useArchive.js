import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { archiveApi } from '../api/archive'

export function useArchive() {
  return useQuery({
    queryKey: ['archive'],
    queryFn: archiveApi.getAll,
  })
}

export function useRestoreArchivedTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: archiveApi.restore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteArchivedTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: archiveApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive'] })
    },
  })
}
