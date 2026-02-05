import { create } from 'zustand'

export const useUIStore = create((set) => ({
  taskModalOpen: false,
  taskModalData: null,
  openTaskModal: (task = null) => set({ taskModalOpen: true, taskModalData: task }),
  closeTaskModal: () => set({ taskModalOpen: false, taskModalData: null }),

  planModalOpen: false,
  planModalTaskId: null,
  openPlanModal: (taskId) => set({ planModalOpen: true, planModalTaskId: taskId }),
  closePlanModal: () => set({ planModalOpen: false, planModalTaskId: null }),

  sessionModalOpen: false,
  sessionModalData: null,
  openSessionModal: (session) => set({ sessionModalOpen: true, sessionModalData: session }),
  closeSessionModal: () => set({ sessionModalOpen: false, sessionModalData: null }),

  reportModalOpen: false,
  reportModalData: null,
  openReportModal: (report) => set({ reportModalOpen: true, reportModalData: report }),
  closeReportModal: () => set({ reportModalOpen: false, reportModalData: null }),

  detailModalOpen: false,
  detailTask: null,
  openDetailModal: (task) => set({ detailModalOpen: true, detailTask: task }),
  closeDetailModal: () => set({ detailModalOpen: false, detailTask: null }),

  archiveOpen: false,
  toggleArchive: () => set((state) => ({ archiveOpen: !state.archiveOpen })),

  filterPriority: 'all',
  setFilterPriority: (priority) => set({ filterPriority: priority }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
