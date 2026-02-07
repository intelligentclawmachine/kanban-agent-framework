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

  // Agent Manager modal state
  agentModalOpen: false,
  agentModalData: null, // null for create, agent object for edit
  openAgentModal: (agent = null) => set({ agentModalOpen: true, agentModalData: agent }),
  closeAgentModal: () => set({ agentModalOpen: false, agentModalData: null }),

  // Agent Manager view state
  activeView: 'kanban', // 'kanban' | 'agents'
  setActiveView: (view) => set({ activeView: view }),

  // Agent filter/search state
  agentSearchQuery: '',
  setAgentSearchQuery: (query) => set({ agentSearchQuery: query }),
  agentTypeFilter: 'all',
  setAgentTypeFilter: (type) => set({ agentTypeFilter: type }),
  agentTagFilter: [],
  setAgentTagFilter: (tags) => set({ agentTagFilter: tags }),
  agentSortBy: 'name', // 'name' | 'usage' | 'createdAt' | 'updatedAt'
  setAgentSortBy: (sort) => set({ agentSortBy: sort }),
  agentSortOrder: 'asc', // 'asc' | 'desc'
  setAgentSortOrder: (order) => set({ agentSortOrder: order }),
  agentViewMode: 'grid', // 'grid' | 'list'
  setAgentViewMode: (mode) => set({ agentViewMode: mode }),

  archiveOpen: false,
  toggleArchive: () => set((state) => ({ archiveOpen: !state.archiveOpen })),

  filterPriority: 'all',
  setFilterPriority: (priority) => set({ filterPriority: priority }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
