import React from 'react'
import { useActiveSessions } from '../../hooks/useSessions'
import SessionCard from './SessionCard'
import './ActiveSessions.css'

function ActiveSessions() {
  const { data, isLoading, refetch } = useActiveSessions()
  const sessions = data?.sessions || []

  return (
    <div className="active-agents-section">
      <div className="section-header">
        <h2>🤖 Active Agents</h2>
        <span className="agent-count" id="activeAgentCount">{sessions.length}</span>
        <button className="btn btn-small btn-secondary" type="button" onClick={() => refetch()}>
          🔄 Refresh
        </button>
      </div>
      <div className="horizontal-agent-list" id="horizontalAgentList">
        {isLoading ? (
          <div className="empty-agents">
            <span className="empty-icon">🤖</span>
            <p>Loading agents...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-agents">
            <span className="empty-icon">🤖</span>
            <p>No active agents</p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>Start a task to see it here</p>
          </div>
        ) : (
          sessions.map((session) => <SessionCard key={session.id} session={session} />)
        )}
      </div>
    </div>
  )
}

export default ActiveSessions
