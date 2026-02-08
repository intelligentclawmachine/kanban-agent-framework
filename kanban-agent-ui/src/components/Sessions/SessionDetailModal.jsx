import React, { useEffect, useRef } from 'react'
import { useSessionThoughts } from '../../hooks/useSessions'
import './SessionDetailModal.css'

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
  thinking: '🧠',
  text: '💬',
  tool: '🔧',
  toolResult: '📋',
}

function SessionDetailModal({ session, elapsed, health, onClose, onKill }) {
  const { data: thoughtsData } = useSessionThoughts(session.id)
  const scrollRef = useRef(null)

  const thoughts = thoughtsData?.thoughts || []

  // Auto-scroll to bottom when new thoughts arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thoughts.length])

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal session-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {session.type === 'planning' ? '📝' : '⚡'}{' '}
            {session.type === 'planning' ? 'Planning' : 'Executing'}:{' '}
            {session.taskTitle || 'Untitled'}
          </h2>
          <button className="modal-close" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="session-detail-summary">
          <div className="summary-row">
            <span className="summary-label">Agent</span>
            <span className="summary-value">
              {session.agentType || 'auto'}
              {session.currentStepModel ? ` (${session.currentStepModel})` : ''}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Step</span>
            <span className="summary-value">
              {session.currentStep || '—'}
              {session.stepsTotal ? ` of ${session.stepsTotal}` : ''}
              {session.currentStepTitle ? ` · "${session.currentStepTitle}"` : ''}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Elapsed</span>
            <span className="summary-value">{formatElapsed(elapsed)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Health</span>
            <span className="summary-value">
              {health.dot} {health.label}
            </span>
          </div>
          {session.tokensUsed > 0 && (
            <div className="summary-row">
              <span className="summary-label">Tokens</span>
              <span className="summary-value">
                {session.tokensUsed?.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="session-detail-thoughts-header">
          💭 Agent Thoughts {thoughts.length > 0 && <span className="thought-count">({thoughts.length})</span>}
          <span className="thoughts-live-dot" />
        </div>

        <div className="session-detail-thoughts" ref={scrollRef}>
          {thoughts.length === 0 ? (
            <div className="thoughts-empty">Waiting for agent activity...</div>
          ) : (
            thoughts.map((t, i) => (
              <div key={i} className={`thought-entry thought-${t.type}`}>
                <span className="thought-entry-icon">
                  {THOUGHT_ICONS[t.type] || '💭'}
                </span>
                <div className="thought-entry-content">
                  {t.type === 'tool' ? (
                    <>
                      <span className="thought-tool-name">{t.toolName}</span>
                      {t.toolArgs && (
                        <span className="thought-tool-args">{t.toolArgs}</span>
                      )}
                    </>
                  ) : t.type === 'toolResult' ? (
                    <>
                      {t.toolName && (
                        <span className="thought-tool-name">{t.toolName} →</span>
                      )}
                      <span className="thought-result-text">{t.content}</span>
                    </>
                  ) : (
                    <span>{t.content}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="session-detail-actions">
          <button className="agent-btn-kill" type="button" onClick={onKill}>
            ⏹️ Stop Agent
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionDetailModal
