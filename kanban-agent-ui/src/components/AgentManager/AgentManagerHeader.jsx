import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { AGENT_TYPE_OPTIONS } from '../../utils/agentConstants'
import './AgentManagerHeader.css'

function AgentManagerHeader({ agentCount = 0 }) {
  const {
    agentSearchQuery,
    setAgentSearchQuery,
    agentTypeFilter,
    setAgentTypeFilter,
    agentSortBy,
    setAgentSortBy,
    agentViewMode,
    setAgentViewMode,
    openAgentModal,
  } = useUIStore()

  return (
    <div className="agent-manager-header">
      <div className="agent-header-title">
        <h1>🤖 Agent Manager</h1>
        <span className="agent-count">{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="agent-header-controls">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search agents..."
            value={agentSearchQuery}
            onChange={(e) => setAgentSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={agentTypeFilter}
          onChange={(e) => setAgentTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {AGENT_TYPE_OPTIONS.map((type) => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>

        <select
          className="sort-select"
          value={agentSortBy}
          onChange={(e) => setAgentSortBy(e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="usage">Sort by Usage</option>
          <option value="createdAt">Sort by Created</option>
          <option value="updatedAt">Sort by Updated</option>
        </select>

        <div className="view-toggle">
          <button
            type="button"
            className={`view-btn ${agentViewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setAgentViewMode('grid')}
            title="Grid view"
          >
            ▦
          </button>
          <button
            type="button"
            className={`view-btn ${agentViewMode === 'list' ? 'active' : ''}`}
            onClick={() => setAgentViewMode('list')}
            title="List view"
          >
            ☰
          </button>
        </div>

        <button
          className="btn btn-primary"
          type="button"
          onClick={() => openAgentModal()}
        >
          + New Agent
        </button>
      </div>
    </div>
  )
}

export default AgentManagerHeader
