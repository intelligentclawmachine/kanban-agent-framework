import React from 'react'
import { useAgents } from '../../hooks/useAgents'
import { useUIStore } from '../../store/uiStore'
import AgentManagerHeader from './AgentManagerHeader'
import AgentCard from './AgentCard'
import AgentListRow from './AgentListRow'
import EmptyState from './EmptyState'
import './AgentManagerPage.css'

function AgentManagerPage() {
  const {
    agentSearchQuery,
    agentTypeFilter,
    agentSortBy,
    agentSortOrder,
    agentViewMode,
  } = useUIStore()

  const { data, isLoading, error } = useAgents({
    search: agentSearchQuery || undefined,
    type: agentTypeFilter !== 'all' ? agentTypeFilter : undefined,
    sort: agentSortBy,
    order: agentSortOrder,
  })

  const agents = data?.agents || []

  // Client-side filtering/sorting as fallback
  const filteredAgents = React.useMemo(() => {
    let result = [...agents]

    // Filter by search query
    if (agentSearchQuery) {
      const query = agentSearchQuery.toLowerCase()
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          agent.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by type
    if (agentTypeFilter && agentTypeFilter !== 'all') {
      result = result.filter((agent) => agent.type === agentTypeFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (agentSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'usage':
          comparison = (b.metadata?.usageCount || 0) - (a.metadata?.usageCount || 0)
          break
        case 'createdAt':
          comparison = new Date(b.createdAt) - new Date(a.createdAt)
          break
        case 'updatedAt':
          comparison = new Date(b.updatedAt) - new Date(a.updatedAt)
          break
        default:
          comparison = 0
      }
      return agentSortOrder === 'desc' ? -comparison : comparison
    })

    // Sort default agent to top
    result.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return 0
    })

    return result
  }, [agents, agentSearchQuery, agentTypeFilter, agentSortBy, agentSortOrder])

  if (isLoading) {
    return (
      <div className="agent-manager-page">
        <AgentManagerHeader agentCount={0} />
        <div className="agent-loading">
          <div className="loading-spinner" />
          <p>Loading agents...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="agent-manager-page">
        <AgentManagerHeader agentCount={0} />
        <div className="agent-error">
          <p>⚠️ Error loading agents: {error.message}</p>
          <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="agent-manager-page">
      <AgentManagerHeader agentCount={filteredAgents.length} />

      {filteredAgents.length === 0 ? (
        <EmptyState hasFilters={!!agentSearchQuery || agentTypeFilter !== 'all'} />
      ) : agentViewMode === 'grid' ? (
        <div className="agent-grid">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="agent-list">
          <div className="agent-list-header">
            <span className="col-name">Agent</span>
            <span className="col-type">Type</span>
            <span className="col-model">Model</span>
            <span className="col-usage">Usage</span>
            <span className="col-actions">Actions</span>
          </div>
          {filteredAgents.map((agent) => (
            <AgentListRow key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}

export default AgentManagerPage
