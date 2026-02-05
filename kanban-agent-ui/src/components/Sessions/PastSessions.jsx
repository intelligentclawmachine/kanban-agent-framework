import React from 'react'
import { useSessionHistory } from '../../hooks/useSessions'
import PastSessionCard from './PastSessionCard'
import './PastSessions.css'

function PastSessions() {
  const { data, isLoading, refetch } = useSessionHistory(10)
  const sessions = data?.sessions || []
  const totals = data?.totals || {}

  return (
    <div className="past-sessions-section">
      <div className="section-header">
        <h2>📊 Past Sessions</h2>
        <span className="session-count" id="horizontalSessionCount">{sessions.length}</span>
        <button className="btn btn-small btn-secondary" type="button" onClick={() => refetch()}>
          🔄 Refresh
        </button>
      </div>
      <div className="horizontal-session-list" id="horizontalSessionList">
        {isLoading ? (
          <div className="empty-agents">
            <span className="empty-icon">📊</span>
            <p>Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-agents">
            <span className="empty-icon">📊</span>
            <p>No completed sessions</p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>Execute tasks to see them here</p>
          </div>
        ) : (
          sessions.map((session) => <PastSessionCard key={session.id} session={session} />)
        )}
      </div>
      <div className="session-totals-bar" id="horizontalSessionTotals">
        Total: ${(totals.cost || 0).toFixed(3)} | {totals.duration || 0} min | {sessions.length} sessions
      </div>
    </div>
  )
}

export default PastSessions
