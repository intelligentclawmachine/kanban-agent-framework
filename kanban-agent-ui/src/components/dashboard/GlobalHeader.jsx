import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useTasks } from '../../hooks/useTasks'

function GlobalHeader() {
  const activeView = useUIStore((state) => state.activeView)
  const setActiveView = useUIStore((state) => state.setActiveView)
  const searchQuery = useUIStore((state) => state.searchQuery)
  const setSearchQuery = useUIStore((state) => state.setSearchQuery)
  const openTaskModal = useUIStore((state) => state.openTaskModal)
  const { refetch } = useTasks()

  const navButtons = [
    { mode: 'kanban', label: 'Kanban' },
    { mode: 'reports', label: 'Reports' },
    { mode: 'agents', label: 'Agent Manager' },
    { mode: 'sessions', label: 'Sessions' },
    { mode: 'usage', label: 'Usage' },
  ]

  return (
    <header className="global-header">
      <div className="brand-group">
        <div className="brand-pill">Kanban Agent</div>
        <div className="view-toggle">
          {navButtons.map((btn) => (
            <button
              key={btn.mode}
              type="button"
              className={`view-toggle-button ${activeView === btn.mode ? 'is-active' : ''}`}
              onClick={() => setActiveView(btn.mode)}
              aria-pressed={activeView === btn.mode}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="header-center">
        <div className="search-shell">
          <span aria-hidden="true" className="search-icon">&#x2318;</span>
          <input
            className="command-search"
            type="search"
            placeholder="Search tasks..."
            aria-label="Search tasks, agents, reports"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sync-pill" role="status" aria-live="polite">
          Synced
        </div>
      </div>

      <div className="header-actions">
        <button type="button" className="ghost-button" onClick={() => refetch()}>
          Refresh
        </button>
        <button type="button" className="primary-button" onClick={() => openTaskModal()}>
          + New Task
        </button>
      </div>
    </header>
  )
}

export default GlobalHeader
