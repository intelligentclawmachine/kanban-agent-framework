import React from 'react'
import { useUIStore } from '../../store/uiStore'
import './ReportModal.css'

function ReportModal() {
  const { reportModalOpen, reportModalData, closeReportModal } = useUIStore()

  if (!reportModalOpen || !reportModalData) return null

  const report = reportModalData
  const isError = report.error || report.whatWasAccomplished?.includes('❌ EXECUTION FAILED')

  return (
    <div className="modal-overlay active" onClick={closeReportModal}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Report Detail</h2>
          <button className="modal-close" type="button" onClick={closeReportModal}>×</button>
        </div>
        <div
          className="detail-section"
          style={{
            background: isError ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)',
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${isError ? 'var(--accent-red)' : 'rgba(76, 175, 80, 0.3)'}`,
          }}
        >
          <h3 style={{ color: isError ? 'var(--accent-red)' : 'var(--accent-green)', marginBottom: '16px' }}>
            {isError ? '❌ ' : ''}{report.title}
          </h3>
          <p>{report.whatWasAccomplished}</p>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
