import React, { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import { useSessionThoughts, useKillSession } from '../../hooks/useSessions'
import './SessionViewModal.css'

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const THOUGHT_ICONS = {
  thinking: '\u{1F9E0}',
  text: '\u{1F4AC}',
  tool: '\u{1F527}',
  toolResult: '\u{1F4CB}',
}

const HEALTH_CONFIG = {
  healthy: { dot: '\u{1F7E2}', label: 'Active' },
  slow: { dot: '\u{1F7E1}', label: 'Slow' },
  stale: { dot: '\u{1F534}', label: 'Stale' },
}

function SessionViewModal() {
  const { sessionModalOpen, sessionModalData, closeSessionModal } = useUIStore()
  const killSession = useKillSession()
  const scrollRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)

  const session = sessionModalData
  const sessionId = session?.sessionId || session?.id
  const isActive = session?.status === 'running' || session?.status === 'executing' || session?.status === 'planning'

  const { data: thoughtsData } = useSessionThoughts(
    sessionId,
    sessionModalOpen && !!sessionId
  )
  const thoughts = thoughtsData?.thoughts || []

  // Elapsed timer
  useEffect(() => {
    if (!sessionModalOpen || !session?.startedAt) return
    const start = new Date(session.startedAt).getTime()
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [sessionModalOpen, session?.startedAt])

  // Auto-scroll thoughts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thoughts.length])

  if (!sessionModalOpen || !session) return null

  const health = HEALTH_CONFIG[session.health] || HEALTH_CONFIG.healthy

  const handleKill = (e) => {
    e.stopPropagation()
    if (window.confirm('Kill this session?')) {
      killSession.mutate(sessionId)
      closeSessionModal()
    }
  }

  return (
    <div className="modal-overlay active" onClick={closeSessionModal}>
      <div className="modal session-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {session.type === 'planning' ? '\u{1F4DD}' : '\u26A1'}{' '}
            {session.type === 'planning' ? 'Planning' : 'Executing'}:{' '}
            {session.taskTitle || 'Untitled'}
          </h2>
          <button className="modal-close" type="button" onClick={closeSessionModal}>
            &times;
          </button>
        </div>

        <div className="session-view-summary">
          <div className="sv-row">
            <span className="sv-label">Agent</span>
            <span className="sv-value">
              {session.agentType || 'auto'}
              {(session.currentStepModel || session.model) ? ` (${session.currentStepModel || session.model})` : ''}
            </span>
          </div>
          <div className="sv-row">
            <span className="sv-label">Step</span>
            <span className="sv-value">
              {session.currentStep || '\u2014'}
              {(session.stepsTotal || session.totalSteps) ? ` of ${session.stepsTotal || session.totalSteps}` : ''}
              {session.currentStepTitle ? ` \u00b7 "${session.currentStepTitle}"` : ''}
            </span>
          </div>
          <div className="sv-row">
            <span className="sv-label">Elapsed</span>
            <span className="sv-value">{session.startedAt ? formatElapsed(elapsed) : session.durationMinutes ? session.durationMinutes + 'm' : '\u2014'}</span>
          </div>
          <div className="sv-row">
            <span className="sv-label">Health</span>
            <span className="sv-value">
              {health.dot} {health.label}
            </span>
          </div>
          {(session.tokensUsed > 0 || session.totalTokens > 0) && (
            <div className="sv-row">
              <span className="sv-label">Tokens</span>
              <span className="sv-value">
                {(session.tokensUsed || session.totalTokens || 0).toLocaleString()}
              </span>
            </div>
          )}
          {session.estimatedCost > 0 && (
            <div className="sv-row">
              <span className="sv-label">Cost</span>
              <span className="sv-value">${session.estimatedCost.toFixed(4)}</span>
            </div>
          )}
          {session.status && (
            <div className="sv-row">
              <span className="sv-label">Status</span>
              <span className="sv-value">{session.status}</span>
            </div>
          )}
        </div>

        {sessionId && (
          <>
            <div className="sv-thoughts-header">
              {'💭'} Agent Thoughts{' '}
              {thoughts.length > 0 && (
                <span className="sv-thought-count">({thoughts.length})</span>
              )}
              {isActive && <span className="sv-live-dot" />}
            </div>

            <div className="sv-thoughts" ref={scrollRef}>
              {thoughts.length === 0 ? (
                <div className="sv-thoughts-empty">
                  {isActive ? 'Waiting for agent activity...' : 'No thoughts recorded for this session.'}
                </div>
              ) : (
                thoughts.map((t, i) => (
                  <div key={i} className={`sv-thought-entry sv-thought-${t.type}`}>
                    <span className="sv-thought-icon">
                      {THOUGHT_ICONS[t.type] || '\u{1F4AD}'}
                    </span>
                    <div className="sv-thought-content">
                      {t.type === 'tool' ? (
                        <>
                          <span className="sv-tool-name">{t.toolName}</span>
                          {t.toolArgs && (
                            <span className="sv-tool-args">{t.toolArgs}</span>
                          )}
                        </>
                      ) : t.type === 'toolResult' ? (
                        <>
                          {t.toolName && (
                            <span className="sv-tool-name">{t.toolName} &rarr;</span>
                          )}
                          <span className="sv-result-text">{t.content}</span>
                        </>
                      ) : (
                        <span>{t.content}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {isActive && (
          <div className="sv-actions">
            <button className="agent-btn-kill" type="button" onClick={handleKill}>
              {'⏹️'} Stop Agent
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionViewModal
