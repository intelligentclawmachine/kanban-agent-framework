import React from 'react'
import { useActiveSessions, useSessionHistory, useOpenClawSessions } from '../../hooks/useSessions'
import { useUIStore } from '../../store/uiStore'
import SessionCard from './SessionCard'
import PastSessionCard from './PastSessionCard'
import OpenClawSessionCard from './OpenClawSessionCard'
import './OpenClawSessionCard.css'

function SessionsPage() {
  const { data: activeData, isLoading: activeLoading } = useActiveSessions()
  const { data: historyData, isLoading: historyLoading } = useSessionHistory(50)
  const { data: openclawData, isLoading: openclawLoading } = useOpenClawSessions()
  const openSessionModal = useUIStore((state) => state.openSessionModal)

  const activeSessions = activeData?.sessions || []
  const pastSessions = historyData?.sessions || []
  const openclawSessions = openclawData?.sessions || []

  // Separate kanban-spawned from native OpenClaw sessions
  const nativeSessions = openclawSessions.filter((s) => !s.key.startsWith('kanban-'))

  const totalCost = pastSessions.reduce((sum, s) => sum + (s.estimatedCost || 0), 0)
  const totalDuration = pastSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

  return (
    <div className="sessions-page">
      {/* Kanban Agent Sessions */}
      <section className="sessions-page-section">
        <div className="section-header">
          <h2>Kanban Agents</h2>
          <span className="agent-count">{activeSessions.length}</span>
        </div>
        <p className="section-subtitle">Task executions spawned from this board</p>
        <div className="sessions-page-grid">
          {activeLoading ? (
            <div className="empty-agents">
              <p>Loading...</p>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="empty-agents">
              <span className="empty-icon">&#x1F47F;</span>
              <p>No active kanban agents</p>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Execute a task to summon one</p>
            </div>
          ) : (
            activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))
          )}
        </div>
      </section>

      {/* OpenClaw Native Sessions */}
      <section className="sessions-page-section">
        <div className="section-header">
          <h2>OpenClaw Gateway Sessions</h2>
          <span className="agent-count">{nativeSessions.length}</span>
        </div>
        <p className="section-subtitle">All sessions across the OpenClaw gateway</p>
        <div className="sessions-page-grid">
          {openclawLoading ? (
            <div className="empty-agents">
              <p>Scrying the gateway...</p>
            </div>
          ) : nativeSessions.length === 0 ? (
            <div className="empty-agents">
              <span className="empty-icon">&#x1F576;&#xFE0F;</span>
              <p>No gateway sessions</p>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>The gateway is silent</p>
            </div>
          ) : (
            nativeSessions.map((session) => (
              <OpenClawSessionCard key={session.sessionId} session={session} />
            ))
          )}
        </div>
      </section>

      {/* Past Sessions */}
      <section className="sessions-page-section">
        <div className="section-header">
          <h2>Past Sessions</h2>
          <span className="session-count">{pastSessions.length}</span>
        </div>
        <div className="sessions-page-grid">
          {historyLoading ? (
            <div className="empty-agents">
              <p>Loading...</p>
            </div>
          ) : pastSessions.length === 0 ? (
            <div className="empty-agents">
              <span className="empty-icon">&#x1F4C2;</span>
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
