import React from 'react'
import { KanbanColumn } from '../../types/dashboard'

interface KanbanBoardProps {
  columns: KanbanColumn[]
  focusHighlightActive: boolean
  dragTarget: string | null
  onColumnHover: (id: string | null) => void
  goalOverlay: string
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  focusHighlightActive,
  dragTarget,
  onColumnHover,
  goalOverlay,
}) => {
  return (
    <section className="kanban-area" aria-label="Kanban board">
      <div className="goal-lane-overlay" aria-hidden="true">
        <p className="goal-lane-label">Goal lane overlay</p>
        <p className="goal-lane-body">{goalOverlay}</p>
      </div>
      <div className="kanban-grid">
        {columns.map((column) => {
          const isToday = column.id === 'today'
          return (
            <article
              key={column.id}
              className={`kanban-column ${isToday && focusHighlightActive ? 'column-highlight' : ''}`}
              data-drop-target={dragTarget === column.id}
              onMouseEnter={() => onColumnHover(column.id)}
              onMouseLeave={() => onColumnHover(null)}
            >
              <header className="column-header">
                <div>
                  <p className="column-title">{column.title}</p>
                  <p className="column-subtitle">{column.subtitle}</p>
                </div>
                <div className="column-controls">
                  <span className="task-count">{column.count}</span>
                  <button type="button" className="add-task" aria-label={`Add task to ${column.title}`}>
                    +
                  </button>
                </div>
              </header>

              {column.focusLane && (
                <div className="focus-lane" role="region" aria-label="Focus lane">
                  <div className="focus-lane-header">
                    <p className="focus-lane-title">{column.focusLane.title}</p>
                    <p className="focus-lane-description">{column.focusLane.description}</p>
                  </div>
                  <ul>
                    {column.focusLane.entries.map((entry) => (
                      <li key={entry.title}>
                        <div>
                          <p className="focus-entry-title">{entry.title}</p>
                          <p className="focus-entry-meta">{entry.owner} • {entry.due}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="task-list">
                {column.tasks.map((task) => (
                  <article key={task.id} className={`task-card task-${task.statusTone}`}>
                    <div className="task-card-header">
                      <div>
                        <p className="task-title">{task.title}</p>
                        <p className="task-plan">{task.planStatus}</p>
                      </div>
                      <span className={`status-badge status-${task.statusTone}`}>{task.statusLabel}</span>
                    </div>
                    <p className="task-description">{task.description}</p>
                    <div className="task-foot">
                      <div className="task-meta">
                        <span className="task-owner">{task.owner}</span>
                        <span className="task-runtime">{task.runtime}</span>
                      </div>
                      <span className="priority-pill">{task.priority}</span>
                    </div>
                    <div className="task-attachments">
                      <span>{task.attachments} attachments</span>
                    </div>
                    <div className="task-actions">
                      <button
                        type="button"
                        className={`task-start ${task.statusTone === 'running' ? 'is-running' : ''}`}
                        aria-label={`Start ${task.title}`}
                      >
                        {task.statusTone === 'running' ? 'Running' : 'Start'}
                      </button>
                      <button type="button" className="ghost-mini" aria-label={`View details for ${task.title}`}>
                        View
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default KanbanBoard
