import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useUIStore } from '../../store/uiStore'
import TaskCard from './TaskCard'

const COLUMN_LABELS = {
  backlog: '📚 Backlog',
  today: '📅 Today',
  tomorrow: '🌅 Tomorrow',
}

function KanbanColumn({ status, tasks }) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } })
  const openTaskModal = useUIStore((state) => state.openTaskModal)

  return (
    <div className="kanban-column" data-column={status} data-drag-over={isOver}>
      <div className="column-header">
        <h2>{COLUMN_LABELS[status] || status}</h2>
        <span className="task-count" id={`count-${status}`}>{tasks.length}</span>
        <button
          className="add-task-btn"
          type="button"
          data-status={status}
          onClick={() => openTaskModal({ status })}
        >
          +
        </button>
      </div>
      <div className="task-list sortable" ref={setNodeRef} data-status={status}>
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No {status} tasks</p>
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </SortableContext>
      </div>
    </div>
  )
}

export default KanbanColumn
