import React from 'react'
import { useUIStore } from '../../store/uiStore'
import './TaskDetailModal.css'

function TaskDetailModal() {
  const { detailModalOpen, detailTask, closeDetailModal } = useUIStore()

  if (!detailModalOpen || !detailTask) return null

  const task = detailTask

  return (
    <div className="modal-overlay active" onClick={closeDetailModal}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button className="modal-close" type="button" onClick={closeDetailModal}>×</button>
        </div>
        <div className="detail-section">
          <h3>Status & Priority</h3>
          <div className="detail-row">
            <span className={`status-badge ${task.status}`}>{task.status}</span>
            <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>{task.priority}</span>
          </div>
        </div>
        <div className="detail-section">
          <h3>Description</h3>
          <p>{task.description || 'No description provided.'}</p>
        </div>
        {task.completionSummary ? (
          <div className="detail-section" style={{
            background: 'rgba(76, 175, 80, 0.15)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(76, 175, 80, 0.3)'
          }}>
            <h3 style={{ color: '#4caf50', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✅ Agent Execution Complete
            </h3>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginTop: '10px', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {task.completionSummary.whatWasAccomplished}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default TaskDetailModal
