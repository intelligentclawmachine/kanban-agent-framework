import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api/reports'

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.getAll,
  })
}

export function useReport(reportId) {
  return useQuery({
    queryKey: ['reports', reportId],
    queryFn: () => reportsApi.getById(reportId),
    enabled: Boolean(reportId),
  })
}
