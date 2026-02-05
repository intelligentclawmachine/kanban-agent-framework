import React from 'react'

function PastSessionCard({ session }) {
  const statusIcon = session.status === 'complete'
    ? '✅'
    : session.status === 'error'
      ? '❌'
      : session.status === 'killed'
        ? '⏹️'
        : '✓'

  return (
    <div className={`horizontal-session-card ${session.status}`}>
      <div className="session-card-header">
        <span style={{ fontSize: '11px' }}>{statusIcon} {session.type || 'Agent'}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          {session.durationMinutes || 0} min
        </span>
      </div>
      <div className="session-card-title">{session.taskTitle || 'Untitled'}</div>
      <div className="session-card-meta">
        <span>${(session.estimatedCost || 0).toFixed(3)}</span>
        <span>{session.tokensUsed || 0} tokens</span>
      </div>
    </div>
  )
}

export default PastSessionCard
