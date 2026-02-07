import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useDuplicateAgent, useDeleteAgent, useSetDefaultAgent } from '../../hooks/useAgents'
import { useToast } from '../Toast'
import { AGENT_TYPE_OPTIONS, ALL_MODELS } from '../../utils/agentConstants'
import './AgentCard.css'

function AgentCard({ agent }) {
  const openAgentModal = useUIStore((state) => state.openAgentModal)
  const duplicateAgent = useDuplicateAgent()
  const deleteAgent = useDeleteAgent()
  const setDefaultAgent = useSetDefaultAgent()
  const toast = useToast()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef(null)

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const typeInfo = AGENT_TYPE_OPTIONS.find((t) => t.value === agent.type) || AGENT_TYPE_OPTIONS.find((t) => t.value === 'custom')
  const modelInfo = ALL_MODELS.find((m) => m.value === agent.model)

  const handleEdit = () => {
    setMenuOpen(false)
    openAgentModal(agent)
  }

  const handleDuplicate = async () => {
    setMenuOpen(false)
    try {
      await duplicateAgent.mutateAsync({ id: agent.id, newName: `${agent.name} (Copy)` })
      toast.success('Agent duplicated successfully')
    } catch (err) {
      toast.error(`Failed to duplicate agent: ${err.message}`)
    }
  }

  const handleSetDefault = async () => {
    setMenuOpen(false)
    try {
      await setDefaultAgent.mutateAsync(agent.id)
      toast.success(`${agent.name} set as default agent`)
    } catch (err) {
      toast.error(`Failed to set default: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    setMenuOpen(false)
    if (!confirm(`Are you sure you want to delete "${agent.name}"? This cannot be undone.`)) {
      return
    }
    try {
      await deleteAgent.mutateAsync(agent.id)
      toast.success('Agent deleted successfully')
    } catch (err) {
      toast.error(`Failed to delete agent: ${err.message}`)
    }
  }

  const formatLastUsed = (dateString) => {
    if (!dateString) return 'Never used'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      className={`agent-card ${agent.isDefault ? 'is-default' : ''}`}
      style={{ '--agent-color': agent.identity?.color || '#4a90d9' }}
    >
      {agent.isDefault && <div className="default-badge">⭐ Default</div>}

      <div className="agent-card-header">
        <div className="agent-icon">{agent.icon || typeInfo.icon}</div>
        <div className="agent-info">
          <h3 className="agent-name">{agent.name}</h3>
          <span className={`agent-type-badge type-${agent.type}`}>
            {typeInfo.icon} {typeInfo.label}
          </span>
        </div>
        <div className="agent-menu-container" ref={menuRef}>
          <button
            className="agent-menu-btn"
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Agent actions"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="agent-menu-dropdown">
              <button type="button" onClick={handleEdit}>✏️ Edit</button>
              <button type="button" onClick={handleDuplicate}>📋 Duplicate</button>
              {!agent.isDefault && (
                <button type="button" onClick={handleSetDefault}>⭐ Set as Default</button>
              )}
              <hr />
              <button type="button" className="danger" onClick={handleDelete}>🗑️ Delete</button>
            </div>
          )}
        </div>
      </div>

      <p className="agent-description">{agent.description || 'No description'}</p>

      <div className="agent-model">
        <span className="model-label">Model:</span>
        <span className="model-value">{modelInfo?.label || agent.model}</span>
      </div>

      {agent.tags?.length > 0 && (
        <div className="agent-tags">
          {agent.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="agent-tag">#{tag}</span>
          ))}
          {agent.tags.length > 4 && (
            <span className="agent-tag-more">+{agent.tags.length - 4}</span>
          )}
        </div>
      )}

      <div className="agent-stats">
        <span className="stat">
          <span className="stat-value">{agent.metadata?.usageCount || 0}</span>
          <span className="stat-label">uses</span>
        </span>
        <span className="stat">
          <span className="stat-value">{formatLastUsed(agent.metadata?.lastUsedAt)}</span>
        </span>
      </div>

      <button className="agent-edit-btn" type="button" onClick={handleEdit}>
        Edit Agent
      </button>
    </div>
  )
}

export default AgentCard
