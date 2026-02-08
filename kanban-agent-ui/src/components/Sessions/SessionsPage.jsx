import React from 'react'
import { useActiveSessions, useSessionHistory } from '../../hooks/useSessions'
import { useUIStore } from '../../store/uiStore'
import SessionCard from './SessionCard'
import PastSessionCard from './PastSessionCard'

function SessionsPage() {
  const { data: activeData, isLoading: activeLoading, refetch: refetchActive } = useActiveSessions()
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useSessionHistory(50)
  const openSessionModal = useUIStore((state) => state.openSessionModal)

  const activeSessions = activeData?.sessions || []
  const pastSessions = historyData?.sessions || []

  const totalCost = pastSessions.reduce((sum, s) => sum + (s.estimatedCost || 0), 0)
  const totalDuration = pastSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

  return (
    <div className="sessions-page">
      {/* Active Sessions */}
      <section className="sessions-page-section">
        <div className="section-header">
          <h2>Active Sessions</h2>
          <span className="agent-count">{activeSessions.length}</span>
          <button className="btn btn-small btn-secondary" type="button" onClick={() => refetchActive()}>
            Refresh
          </button>
        </div>
        <div className="sessions-page-grid">
          {activeLoading ? (
            <div className="empty-agents">
              <p>Loading...</p>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="empty-agents">
              <span className="empty-icon">🤖</span>
              <p>No active sessions</p>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Start a task to see agents here</p>
            </div>
          ) : (
            activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))
          )}
        </div>
      </section>

      {/* Past Sessions */}
      <section className="sessions-page-section">
        <div className="section-header">
          <h2>Past Sessions</h2>
          <span className="session-count">{pastSessions.length}</span>
          <button className="btn btn-small btn-secondary" type="button" onClick={() => refetchHistory()}>
            Refresh
          </button>
        </div>
        <div className="sessions-page-grid">
          {historyLoading ? (
            <div className="empty-agents">
              <p>Loading...</p>
            </div>
          ) : pastSessions.length === 0 ? (
            <div className="empty-agents">
              <span className="empty-icon">📂</span>
              <p>No past sessions</p>
            </div>
          ) : (
            pastSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => openSessionModal(session)}
                style={{ cursor: 'pointer' }}
              >
                <PastSessionCard session={session} />
              </div>
            ))
          )}
        </div>
        {pastSessions.length > 0 && (
          <div className="session-totals-bar">
            {pastSessions.length} sessions &middot; ${totalCost.toFixed(3)} total cost &middot; {totalDuration} min total
          </div>
        )}
      </section>
    </div>
  )
}

export default SessionsPage
