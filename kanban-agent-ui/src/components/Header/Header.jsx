import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useTasks } from '../../hooks/useTasks'
import './Header.css'

function Header() {
  const setSearchQuery = useUIStore((state) => state.setSearchQuery)
  const openTaskModal = useUIStore((state) => state.openTaskModal)
  const { refetch } = useTasks()

  return (
    <header className="header">
      <h1>📋 Kanban Board</h1>
      <div className="header-actions">
        <div className="sync-status">
          <span className="sync-indicator" id="syncIndicator" />
          <span id="syncStatusText">Synced</span>
        </div>
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
      </div>
    </header>
  )
}

export default Header
