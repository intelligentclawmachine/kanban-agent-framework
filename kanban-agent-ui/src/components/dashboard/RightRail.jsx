import React, { useState } from 'react'
import { useActiveSessions, useSessionHistory, useKillSession } from '../../hooks/useSessions'
import { useUIStore } from '../../store/uiStore'

function formatElapsed(startedAt) {
  if (!startedAt) return '--'
  const ms = Date.now() - new Date(startedAt).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return '<1m'
  if (mins < 60) return mins + 'm'
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm'
}

function RightRail() {
  const { data: activeData } = useActiveSessions()
  const { data: historyData } = useSessionHistory(5)
  const killSession = useKillSession()
  const openSessionModal = useUIStore((state) => state.openSessionModal)

  const activeSessions = activeData?.sessions || []
  const pastSessions = historyData?.sessions || []

  const [collapsed, setCollapsed] = useState({})
  const toggle = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <aside className="right-rail" aria-label="Monitoring and reports">
      {/* Active Agents */}
      <section className="rail-module">
        <div className="rail-header-new">
          <h3>Active Agents ({activeSessions.length})</h3>
          <button type="button" className="ghost-mini" onClick={() => toggle('agents')}>
            {collapsed.agents ? 'Show' : 'Hide'}
          </button>
        </div>
        {!collapsed.agents && (
          <div className="rail-card-stack">
            {activeSessions.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No active sessions
              </p>
            )}
            {activeSessions.map((session) => (
              <article
                key={session.sessionId}
                className={`rail-card rail-card-${session.health || 'info'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => openSessionModal(session)}
              >
                <div className="card-header-new">
                  <div>
                    <p className="card-title-new">{session.taskTitle || 'Untitled'}</p>
                    <p className="card-subtitle-new">Step {session.currentStep || '?'}/{session.totalSteps || '?'}</p>
                  </div>
                  <span
                    className={`status-dot status-${session.health || 'healthy'}`}
                    aria-label={`Health: ${session.health || 'healthy'}`}
                  />
                </div>
                <p className="card-meta-new">{session.model || session.agentType || 'Agent'}</p>
                <p className="card-meta-new">Elapsed {formatElapsed(session.startedAt)}</p>
                <div className="card-actions-new">
                  <button
                    type="button"
                    className="danger-mini"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm('Kill this session?')) {
                        killSession.mutate(session.sessionId)
                      }
                    }}
                  >
                    Kill
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Past Sessions */}
      <section className="rail-module">
        <div className="rail-header-new">
          <h3>Past Sessions</h3>
          <button type="button" className="ghost-mini" onClick={() => toggle('sessions')}>
            {collapsed.sessions ? 'Show' : 'Hide'}
          </button>
        </div>
        {!collapsed.sessions && (
          <div className="rail-card-stack">
            {pastSessions.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No past sessions
              </p>
            )}
            {pastSessions.map((session) => {
              const tone = session.status === 'error' ? 'error' : session.status === 'killed' ? 'warning' : 'success'
              return (
                <article
                  key={session.sessionId}
                  className={`rail-card rail-card-${tone}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openSessionModal(session)}
                >
                  <div className="card-header-new">
                    <p className="card-title-new">{session.taskTitle || 'Untitled'}</p>
                    <span className={`status-dot status-${tone}`} aria-label={session.status} />
                  </div>
                  <p className="card-meta-new">
                    {session.model || 'Agent'} &middot; {session.totalTokens ? (session.totalTokens / 1000).toFixed(1) + 'K tokens' : '--'}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </section>

    </aside>
  )
}

export default RightRail
