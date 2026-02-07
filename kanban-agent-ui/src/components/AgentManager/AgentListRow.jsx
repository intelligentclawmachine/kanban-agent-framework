import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useDuplicateAgent, useDeleteAgent, useSetDefaultAgent } from '../../hooks/useAgents'
import { useToast } from '../Toast'
import { AGENT_TYPE_OPTIONS, ALL_MODELS } from '../../utils/agentConstants'
import './AgentListRow.css'

function AgentListRow({ agent }) {
  const openAgentModal = useUIStore((state) => state.openAgentModal)
  const duplicateAgent = useDuplicateAgent()
  const deleteAgent = useDeleteAgent()
  const setDefaultAgent = useSetDefaultAgent()
  const toast = useToast()

  const typeInfo = AGENT_TYPE_OPTIONS.find((t) => t.value === agent.type) || AGENT_TYPE_OPTIONS.find((t) => t.value === 'custom')
  const modelInfo = ALL_MODELS.find((m) => m.value === agent.model)

  const handleEdit = () => openAgentModal(agent)

  const handleDuplicate = async () => {
    try {
      await duplicateAgent.mutateAsync({ id: agent.id, newName: `${agent.name} (Copy)` })
      toast.success('Agent duplicated')
    } catch (err) {
      toast.error(`Failed to duplicate: ${err.message}`)
    }
  }

  const handleSetDefault = async () => {
    try {
      await setDefaultAgent.mutateAsync(agent.id)
      toast.success(`${agent.name} set as default`)
    } catch (err) {
      toast.error(`Failed to set default: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${agent.name}"?`)) return
    try {
      await deleteAgent.mutateAsync(agent.id)
      toast.success('Agent deleted')
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`)
    }
  }

  return (
    <div className={`agent-list-row ${agent.isDefault ? 'is-default' : ''}`}>
      <div className="col-name">
        <span className="agent-icon">{agent.icon || typeInfo.icon}</span>
        <div className="agent-name-wrapper">
          <span className="agent-name">{agent.name}</span>
          {agent.isDefault && <span className="default-badge">⭐ Default</span>}
        </div>
      </div>
      <div className="col-type">
        <span className={`agent-type-badge type-${agent.type}`}>
          {typeInfo.icon} {typeInfo.label}
        </span>
      </div>
      <div className="col-model">
        <span className="model-name">{modelInfo?.label || agent.model}</span>
      </div>
      <div className="col-usage">
        <span>{agent.metadata?.usageCount || 0} uses</span>
      </div>
      <div className="col-actions">
        <button type="button" className="action-btn" onClick={handleEdit} title="Edit">
          ✏️
        </button>
        <button type="button" className="action-btn" onClick={handleDuplicate} title="Duplicate">
          📋
        </button>
        {!agent.isDefault && (
          <button type="button" className="action-btn" onClick={handleSetDefault} title="Set as Default">
            ⭐
          </button>
        )}
        <button type="button" className="action-btn danger" onClick={handleDelete} title="Delete">
          🗑️
        </button>
      </div>
    </div>
  )
}

export default AgentListRow
