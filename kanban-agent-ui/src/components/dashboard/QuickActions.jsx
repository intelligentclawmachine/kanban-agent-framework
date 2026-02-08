import React from 'react'
import { useActiveSessions, useKillSession } from '../../hooks/useSessions'
import { useTasks } from '../../hooks/useTasks'
import { useUIStore } from '../../store/uiStore'
import client from '../../api/client'

function QuickActions() {
  const { data: sessionsData } = useActiveSessions()
  const { data: tasksData } = useTasks()
  const killSession = useKillSession()
  const openTaskModal = useUIStore((state) => state.openTaskModal)
  const setActiveView = useUIStore((state) => state.setActiveView)

  const activeSessions = sessionsData?.sessions || []
  const tasks = tasksData?.tasks || []
  const pendingTasks = tasks.filter(
    (t) => t.executionStatus === 'plan-pending' || t.executionStatus === 'pending'
  )
  const draftTasks = tasks.filter((t) => t.status !== 'done' && !t.executionStatus)

  const handleKillAll = async () => {
    if (activeSessions.length === 0) return
    if (!window.confirm(`Kill all ${activeSessions.length} active session(s)?`)) return
    for (const session of activeSessions) {
      try {
        await killSession.mutateAsync(session.sessionId)
      } catch (err) {
        console.error('Failed to kill session:', err)
      }
    }
  }

  const handleStartPending = async () => {
    if (pendingTasks.length === 0) return
    const task = pendingTasks[0]
    try {
      await client.post(`/plans/${task.id}/execute`)
    } catch (err) {
      console.error('Failed to start task:', err)
    }
  }

  return (
    <div className="quick-actions-bar">
      <button type="button" className="quick-action-btn" onClick={() => openTaskModal()}>
        + New Task
      </button>
      <button
        type="button"
        className="quick-action-btn"
        onClick={handleStartPending}
        disabled={pendingTasks.length === 0}
      >
        Start Next ({pendingTasks.length})
      </button>
      <button
        type="button"
        className="quick-action-btn"
        onClick={handleKillAll}
        disabled={activeSessions.length === 0}
        style={activeSessions.length > 0 ? { borderColor: 'var(--color-error)', color: 'var(--color-error)' } : undefined}
      >
        Kill All ({activeSessions.length})
      </button>
      <button
        type="button"
        className="quick-action-btn"
        onClick={() => setActiveView('reports')}
      >
        View Reports
      </button>
    </div>
  )
}

export default QuickActions
