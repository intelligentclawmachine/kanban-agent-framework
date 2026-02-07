import React from 'react'
import { ViewMode } from '../../types/dashboard'

interface GlobalHeaderProps {
  viewMode: ViewMode
  onViewChange: (mode: ViewMode) => void
  lastSync: string
}

const GlobalHeader: React.FC<GlobalHeaderProps> = ({ viewMode, onViewChange, lastSync }) => {
  const navButtons: { mode: ViewMode; label: string }[] = [
    { mode: 'kanban', label: 'Kanban' },
    { mode: 'agents', label: 'Agent Manager' },
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
              className={`view-toggle-button ${viewMode === btn.mode ? 'is-active' : ''}`}
              onClick={() => onViewChange(btn.mode)}
              aria-pressed={viewMode === btn.mode}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="header-center">
        <label className="visually-hidden" htmlFor="command-search">
          Command search
        </label>
        <div className="search-shell">
          <span aria-hidden="true" className="search-icon">
            ⌘
          </span>
          <input
            id="command-search"
            className="command-search"
            type="search"
            placeholder="Press ⌘K to search commands"
            aria-label="Search tasks, agents, reports, and commands"
          />
        </div>
        <div className="sync-pill" role="status" aria-live="polite">
          Synced • {lastSync}
        </div>
      </div>

      <div className="header-actions">
        <button type="button" className="ghost-button">
          Refresh
        </button>
        <button type="button" className="primary-button">
          + New Task
        </button>
        <button type="button" className="icon-button" aria-label="Command palette">
          ⌘
        </button>
        <button type="button" className="icon-button" aria-label="Keyboard shortcuts">
          ⌨️
        </button>
        <button type="button" className="icon-button" aria-label="Toggle theme">
          ☀️
        </button>
      </div>
    </header>
  )
}

export default GlobalHeader
