import React from 'react'
import { useUIStore } from '../../store/uiStore'
import './SessionViewModal.css'

function SessionViewModal() {
  const { sessionModalOpen, sessionModalData, closeSessionModal } = useUIStore()

  if (!sessionModalOpen) return null

  return (
    <div className="modal-overlay active" onClick={closeSessionModal}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Session Details</h2>
          <button className="modal-close" type="button" onClick={closeSessionModal}>×</button>
        </div>
        {sessionModalData ? (
          <div className="detail-section">
            <p><strong>Task:</strong> {sessionModalData.taskTitle}</p>
            <p><strong>Status:</strong> {sessionModalData.status}</p>
            <p><strong>Agent:</strong> {sessionModalData.agentType || 'auto'}</p>
          </div>
        ) : (
          <p>No session selected.</p>
        )}
      </div>
    </div>
  )
}

export default SessionViewModal
