import React from 'react'
import { useUIStore } from '../../store/uiStore'
import './EmptyState.css'

function EmptyState({ hasFilters = false }) {
  const openAgentModal = useUIStore((state) => state.openAgentModal)
  const setAgentSearchQuery = useUIStore((state) => state.setAgentSearchQuery)
  const setAgentTypeFilter = useUIStore((state) => state.setAgentTypeFilter)

  const handleClearFilters = () => {
    setAgentSearchQuery('')
    setAgentTypeFilter('all')
  }

  if (hasFilters) {
    return (
      <div className="empty-state">
        <div className="empty-illustration">🔍</div>
        <h2>No agents found</h2>
        <p>No agents match your current filters. Try adjusting your search or filter criteria.</p>
        <button className="btn btn-secondary" type="button" onClick={handleClearFilters}>
          Clear Filters
        </button>
      </div>
    )
  }

  return (
    <div className="empty-state">
      <div className="empty-illustration">
        {/* Pizza Planet aliens in claw machine reference */}
        <span className="alien-group">👽👽👽</span>
        <span className="claw-icon">🪝</span>
      </div>
      <h2>No agents yet</h2>
      <p>
        Create your first agent to build a personalized team of AI workers.
        Each agent can be configured with specific models, tools, and behaviors.
      </p>
      <div className="empty-actions">
        <button className="btn btn-primary" type="button" onClick={() => openAgentModal()}>
          + Create Your First Agent
        </button>
      </div>
      <div className="preset-hint">
        <span className="hint-icon">💡</span>
        <span>Tip: Start with a preset like "Production Coder" or "Deep Researcher" for quick setup.</span>
      </div>
    </div>
  )
}

export default EmptyState
