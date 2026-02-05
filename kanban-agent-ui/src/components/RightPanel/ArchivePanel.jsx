import React from 'react'
import { useArchive, useRestoreArchivedTask, useDeleteArchivedTask } from '../../hooks/useArchive'
import { useUIStore } from '../../store/uiStore'
import './ArchivePanel.css'

function ArchivePanel() {
  const archiveOpen = useUIStore((state) => state.archiveOpen)
  const toggleArchive = useUIStore((state) => state.toggleArchive)
  const { data } = useArchive()
  const archived = data?.archived || []
  const restoreTask = useRestoreArchivedTask()
  const deleteTask = useDeleteArchivedTask()

  if (!archiveOpen) return null

  return (
    <div className="archive-panel">
      <div className="archive-header">
        <h2>📦 Archive</h2>
        <button className="btn btn-small btn-secondary" type="button" onClick={toggleArchive}>Close</button>
      </div>
      <div className="archive-list">
        {archived.length === 0 ? (
          <div className="empty-archive">
            <div className="empty-icon">📦</div>
            <p>No archived tasks</p>
          </div>
        ) : (
          archived.map((task) => (
            <div key={task.id} className="archive-card">
              <div className="archive-title">{task.title}</div>
              <div className="archive-meta">
                <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>{task.priority}</span>
                <span>{new Date(task.archivedAt).toLocaleDateString()}</span>
              </div>
              <div className="archive-actions">
                <button
                  className="btn btn-small btn-secondary"
                  type="button"
                  onClick={() => restoreTask.mutate(task.id)}
                >
                  Restore
                </button>
                <button
                  className="btn btn-small btn-danger"
                  type="button"
                  onClick={() => deleteTask.mutate(task.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ArchivePanel
