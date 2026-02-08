import { create } from 'zustand'

export const useUIStore = create((set) => ({
  // Active view: 'kanban', 'agents', 'sessions', or 'usage'
  activeView: 'kanban',
  setActiveView: (view) => set({ activeView: view }),

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

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Agent modal state
  agentModalOpen: false,
  agentModalData: null,
  openAgentModal: (agent = null) => set({ agentModalOpen: true, agentModalData: agent }),
  closeAgentModal: () => set({ agentModalOpen: false, agentModalData: null }),

  // Agent Manager filters/sort
  agentSearchQuery: '',
  setAgentSearchQuery: (query) => set({ agentSearchQuery: query }),
  agentTypeFilter: 'all',
  setAgentTypeFilter: (filter) => set({ agentTypeFilter: filter }),
  agentTagFilter: 'all',
  setAgentTagFilter: (filter) => set({ agentTagFilter: filter }),
  agentSortBy: 'name',
  setAgentSortBy: (sort) => set({ agentSortBy: sort }),
  agentSortOrder: 'asc',
  setAgentSortOrder: (order) => set({ agentSortOrder: order }),
  agentViewMode: 'grid',
  setAgentViewMode: (mode) => set({ agentViewMode: mode }),
}))
