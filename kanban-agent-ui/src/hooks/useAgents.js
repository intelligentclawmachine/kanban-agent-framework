import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agentsApi } from '../api/agents'

/**
 * Hook to fetch all agent profiles
 * @param {Object} filters - Optional filters
 */
export function useAgents(filters = {}) {
  return useQuery({
    queryKey: ['agents', filters],
    queryFn: () => agentsApi.getAll(filters),
    staleTime: 5000,
  })
}

/**
 * Hook to fetch a single agent profile
 * @param {string} id - Agent ID
 */
export function useAgent(id) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => agentsApi.getById(id),
    enabled: !!id,
  })
}

/**
 * Hook to create a new agent profile
 */
export function useCreateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: agentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

/**
 * Hook to update an agent profile
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }) => agentsApi.update(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['agents'] })
      const previousAgents = queryClient.getQueriesData({ queryKey: ['agents'] })

      // Optimistic update
      queryClient.setQueriesData({ queryKey: ['agents'] }, (oldData) => {
        if (!oldData?.agents) return oldData
        return {
          ...oldData,
          agents: oldData.agents.map((agent) =>
            agent.id === id ? { ...agent, ...updates } : agent
          ),
        }
      })

      return { previousAgents }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      context?.previousAgents?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

/**
 * Hook to delete an agent profile
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: agentsApi.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['agents'] })
      const previousAgents = queryClient.getQueriesData({ queryKey: ['agents'] })

      // Optimistic update
      queryClient.setQueriesData({ queryKey: ['agents'] }, (oldData) => {
        if (!oldData?.agents) return oldData
        return {
          ...oldData,
          agents: oldData.agents.filter((agent) => agent.id !== id),
        }
      })

      return { previousAgents }
    },
    onError: (err, variables, context) => {
      context?.previousAgents?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

/**
 * Hook to duplicate an agent profile
 */
export function useDuplicateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, newName }) => agentsApi.duplicate(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

/**
 * Hook to set an agent as the default
 */
export function useSetDefaultAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: agentsApi.setDefault,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['agents'] })
      const previousAgents = queryClient.getQueriesData({ queryKey: ['agents'] })

      // Optimistic update - mark selected as default, unmark others
      queryClient.setQueriesData({ queryKey: ['agents'] }, (oldData) => {
        if (!oldData?.agents) return oldData
        return {
          ...oldData,
          agents: oldData.agents.map((agent) => ({
            ...agent,
            isDefault: agent.id === id,
          })),
        }
      })

      return { previousAgents }
    },
    onError: (err, variables, context) => {
      context?.previousAgents?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

/**
 * Hook to pick a file using native file dialog
 */
export function usePickFile() {
  return useMutation({
    mutationFn: (options) => agentsApi.pickFile(options),
  })
}

/**
 * Hook to attach a file to an agent
 */
export function useAttachAgentFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ agentId, sourcePath }) => agentsApi.attachFile(agentId, sourcePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

/**
 * Hook to delete a file from an agent
 */
export function useDeleteAgentFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ agentId, fileId }) => agentsApi.deleteFile(agentId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

/**
 * Hook to export an agent profile
 */
export function useExportAgent() {
  return useMutation({
    mutationFn: agentsApi.export,
    onSuccess: (data) => {
      // Trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `agent-${data.name || 'export'}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })
}

/**
 * Hook to import an agent profile
 */
export function useImportAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: agentsApi.import,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

/**
 * Hook to get all unique tags
 */
export function useAgentTags() {
  return useQuery({
    queryKey: ['agents', 'tags'],
    queryFn: agentsApi.getAllTags,
    staleTime: 30000,
  })
}

/**
 * Hook to get available models (filtered by auth)
 */
export function useAvailableModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: agentsApi.getModels,
    staleTime: 60000, // models don't change often
  })
}
