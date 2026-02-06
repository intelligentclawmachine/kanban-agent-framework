import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUIStore } from '../../store/uiStore'
import { useDeleteTask } from '../../hooks/useTasks'
import { useExecutePlan, useStartPlanning } from '../../hooks/usePlans'
import './TaskCard.css'

const STATUS_LABELS = {
  draft: { icon: '📝', label: 'Draft', className: 'status-draft', show: true },
  'plan-pending': { icon: '📋', label: 'Plan Pending', className: 'status-plan-pending', show: true },
  planning: { icon: '🔄', label: 'Planning', className: 'status-planning', show: true },
  'plan-ready': { icon: '✅', label: 'Plan Ready', className: 'status-plan-ready', show: true },
  executing: { icon: '⚡', label: 'Executing', className: 'status-executing', show: true },
  error: { icon: '❌', label: 'Error', className: 'status-error', show: true },
  complete: { icon: '✓', label: 'Complete', className: 'status-complete', show: false },
}

function TaskCard({ task, isDragging = false }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const openTaskModal = useUIStore((state) => state.openTaskModal)
  const openDetailModal = useUIStore((state) => state.openDetailModal)
  const openPlanModal = useUIStore((state) => state.openPlanModal)
  const deleteTask = useDeleteTask()
  const startPlanning = useStartPlanning()
  const executePlan = useExecutePlan()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const statusConfig = STATUS_LABELS[task.executionStatus || 'draft']
  const isExecuting = task.executionStatus === 'executing' || task.executionStatus === 'planning'

  const handleOpenDetail = (event) => {
    event.stopPropagation()
    openDetailModal(task)
  }

  const handleDelete = async (event) => {
    event.stopPropagation()
    if (!confirm('Are you sure you want to delete this task?')) return
    await deleteTask.mutateAsync(task.id)
  }

  const handleStart = async (event) => {
    event.stopPropagation()
    if (isExecuting) return

    try {
      if (task.executionStatus === 'plan-ready') {
        await executePlan.mutateAsync(task.id)
      } else if (task.planFirst) {
        await startPlanning.mutateAsync(task.id)
        openPlanModal(task.id)
      } else {
        await executePlan.mutateAsync(task.id)
      }
    } catch (err) {
      console.error('Failed to start execution', err)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${task.status === 'done' ? 'completed' : ''}`}
      data-task-id={task.id}
      onClick={() => openTaskModal(task)}
      {...attributes}
      {...listeners}
    >
      <div className="task-header">
        <button
          className={`start-btn-inline ${isExecuting ? 'executing' : ''}`}
          type="button"
          onClick={handleStart}
          disabled={isExecuting}
        >
          {isExecuting ? '⏸ Running...' : '▶ Start'}
        </button>
        {statusConfig && statusConfig.show ? (
          <span className={`agent-status-badge ${statusConfig.className}`}>
            {statusConfig.icon} {statusConfig.label}
          </span>
        ) : null}
      </div>

      <h3 className="task-title">{task.title}</h3>
      {task.description ? <p className="task-description">{task.description}</p> : null}
      {task.expectedOutput ? (
        <p className="task-expected-output">
          <strong>Expected:</strong> {task.expectedOutput}
        </p>
      ) : null}

      <div className="task-footer">
        <div
          className="task-actions"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {task.completionSummary ? (
            <button
              className="icon-btn"
              style={{ background: 'var(--accent-green)', color: 'white' }}
              title="View Results"
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handleOpenDetail}
            >
              📊
            </button>
          ) : null}
          <button
            className="icon-btn"
            title="Edit"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => openTaskModal(task)}
          >
            ✏️
          </button>
          <button
            className="icon-btn"
            title="Delete"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleDelete}
          >
            🗑️
          </button>
        </div>
      </div>

      {task.files && task.files.length > 0 ? (
        <div className="task-files">
          <span>📎</span> {task.files.length} file{task.files.length > 1 ? 's' : ''}
        </div>
      ) : null}
    </div>
  )
}

export default TaskCard
