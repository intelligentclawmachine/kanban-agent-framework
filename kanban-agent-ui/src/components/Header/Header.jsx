import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useTasks } from '../../hooks/useTasks'
import './Header.css'

function Header() {
  const setSearchQuery = useUIStore((state) => state.setSearchQuery)
  const openTaskModal = useUIStore((state) => state.openTaskModal)
  const activeView = useUIStore((state) => state.activeView)
  const setActiveView = useUIStore((state) => state.setActiveView)
  const { refetch } = useTasks()

  return (
    <header className="header">
      <div className="header-left">
        <h1>{activeView === 'kanban' ? '📋 Kanban Board' : '🤖 Agent Manager'}</h1>
        <nav className="view-switcher">
          <button
            type="button"
            className={`view-tab ${activeView === 'kanban' ? 'active' : ''}`}
            onClick={() => setActiveView('kanban')}
          >
            📋 Tasks
          </button>
          <button
            type="button"
            className={`view-tab ${activeView === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveView('agents')}
          >
            🤖 Agents
          </button>
        </nav>
      </div>
      <div className="header-actions">
        <div className="sync-status">
          <span className="sync-indicator" id="syncIndicator" />
          <span id="syncStatusText">Synced</span>
        </div>
        {activeView === 'kanban' && (
          <>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                id="searchInput"
                placeholder="Search tasks..."
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => refetch()}>
              🔄 Refresh
            </button>
            <button className="btn btn-primary" type="button" onClick={() => openTaskModal()}>
              + New Task
            </button>
          </>
        )}
      </div>
    </header>
  )
}

export default Header
