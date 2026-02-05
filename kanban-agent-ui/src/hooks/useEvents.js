import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../api/events'

export function useEvents(limit = 50) {
  return useQuery({
    queryKey: ['events', limit],
    queryFn: () => eventsApi.getAll(limit),
  })
}
