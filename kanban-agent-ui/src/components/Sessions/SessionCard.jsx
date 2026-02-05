import React from 'react'
import { useKillSession } from '../../hooks/useSessions'
import { useToast } from '../Toast'

function SessionCard({ session }) {
  const killSession = useKillSession()
  const toast = useToast()

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

  return (
    <div className={`horizontal-agent-card ${session.status}`} id={`h-session-${session.id}`}>
      <div className="agent-card-header">
        <span className="agent-card-type">
          {session.type === 'planning' ? '📝 Planning' : '⚡ Executing'}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          {session.agentType || 'auto'}
        </span>
      </div>
      <div className="agent-card-title">{session.taskTitle || 'Untitled'}</div>
      <div className="agent-card-status">
        {session.currentStepModel ? `🤖 ${session.currentStepModel}` : 'Initializing...'}
        {session.currentStep ? ` • Step ${session.currentStep}` : ''}
      </div>
      <div className="agent-card-actions">
        <button className="agent-btn-kill" type="button" onClick={handleKill}>
          ⏹️ Stop
        </button>
      </div>
    </div>
  )
}

export default SessionCard
