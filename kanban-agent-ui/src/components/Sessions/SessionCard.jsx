import React, { useState, useEffect } from 'react'
import { useKillSession, useSessionThoughts } from '../../hooks/useSessions'
import { useToast } from '../Toast'
import SessionDetailModal from './SessionDetailModal'
import './SessionCard.css'

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const HEALTH_CONFIG = {
  healthy: { dot: '🟢', label: 'Active' },
  slow: { dot: '🟡', label: 'Slow' },
  stale: { dot: '🔴', label: 'Stale' },
}

const THOUGHT_ICONS = {
  thinking: '🧠',
  text: '💬',
  tool: '🔧',
  toolResult: '📋',
}

function SessionCard({ session }) {
  const killSession = useKillSession()
  const toast = useToast()
  const [elapsed, setElapsed] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const { data: thoughtsData } = useSessionThoughts(session.id)

  useEffect(() => {
    if (!session.startedAt) return
    const start = new Date(session.startedAt).getTime()
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.startedAt])

  const handleKill = async (event) => {
    event.stopPropagation()
    if (confirm('Stop this agent?')) {
      try {
        await killSession.mutateAsync(session.id)
        toast.success('Agent stopped')
      } catch (err) {
        toast.error(`Failed to stop agent: ${err.message}`)
      }
    }
  }

  const health = HEALTH_CONFIG[session.health] || HEALTH_CONFIG.healthy

  // Get latest thought for 1-liner display
  const thoughts = thoughtsData?.thoughts || []
  const latestThought = thoughts.length > 0 ? thoughts[thoughts.length - 1] : null

  return (
    <>
      <div
        className={`horizontal-agent-card ${session.status}`}
        id={`h-session-${session.id}`}
        onClick={() => setShowModal(true)}
        style={{ cursor: 'pointer' }}
      >
        <div className="agent-card-header">
          <span className="agent-card-type">
            {session.type === 'planning' ? '📝 Planning' : '⚡ Executing'}
          </span>
          <span className="agent-card-health" title={health.label}>
            {health.dot}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {session.agentType || 'auto'}
          </span>
        </div>
        <div className="agent-card-title">{session.taskTitle || 'Untitled'}</div>
        <div className="agent-card-status">
          {session.currentStepModel ? `🤖 ${session.currentStepModel}` : 'Initializing...'}
          {session.currentStep ? ` · Step ${session.currentStep}` : ''}
          {session.stepsTotal ? `/${session.stepsTotal}` : ''}
          {session.currentStepTitle ? ` · ${session.currentStepTitle}` : ''}
        </div>
        <div className="agent-card-timer">
          ⏱️ {formatElapsed(elapsed)}
          <span className={`health-label health-${session.health || 'healthy'}`}>
            {health.label}
          </span>
        </div>
        {latestThought && (
          <div className="agent-card-thought">
            <span className="thought-icon">
              {THOUGHT_ICONS[latestThought.type] || '💭'}
            </span>
            <span className="thought-text">
              {latestThought.type === 'tool'
                ? latestThought.toolName
                : latestThought.content?.substring(0, 60)}
              {latestThought.content?.length > 60 ? '...' : ''}
            </span>
          </div>
        )}
        <div className="agent-card-actions">
          <button className="agent-btn-kill" type="button" onClick={handleKill}>
            ⏹️ Stop
          </button>
        </div>
      </div>

      {showModal && (
        <SessionDetailModal
          session={session}
          elapsed={elapsed}
          health={health}
          onClose={() => setShowModal(false)}
          onKill={handleKill}
        />
      )}
    </>
  )
}

export default SessionCard
