import React from 'react'
import { useReports } from '../../hooks/useReports'
import { useUIStore } from '../../store/uiStore'
import client from '../../api/client'
import './ReportsBar.css'

function ReportsBar() {
  const { data, refetch } = useReports()
  const reports = data?.reports || []
  const openReportModal = useUIStore((state) => state.openReportModal)
  const toggleArchive = useUIStore((state) => state.toggleArchive)

  return (
    <div className="done-section" id="doneSection">
      <div className="done-header">
        <div className="done-title">
          <h2>📊 Done - Execution Reports</h2>
          <span className="report-count" id="reportCount">
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="done-actions">
          <button className="btn btn-small btn-secondary" type="button" onClick={() => refetch()}>
            🔄 Refresh
          </button>
          <button className="btn btn-small btn-secondary" type="button" onClick={toggleArchive}>📦 Archive</button>
          <button className="btn btn-small btn-secondary" type="button">🗑️ Clear All</button>
        </div>
      </div>
      <div className="reports-container" id="reportsContainer">
        {reports.length === 0 ? (
          <div className="empty-reports" id="emptyReports">
            <div className="empty-icon">📋</div>
            <p>No completed tasks yet</p>
            <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
              Execute tasks to see reports here
            </p>
          </div>
        ) : (
          reports.map((report) => {
            const isError = report.error || report.whatWasAccomplished?.includes('❌ EXECUTION FAILED')
            return (
              <div
                key={report.id}
                className={`report-card ${isError ? 'error' : ''}`}
                onClick={() => openReportModal(report)}
                style={
                  isError
                    ? { borderLeftColor: 'var(--accent-red)', background: 'rgba(244, 67, 54, 0.1)' }
                    : undefined
                }
              >
                <div className="report-header">
                  <div className="report-title">{isError ? '❌ ' : ''}{report.title}</div>
                </div>

                <div className="report-stats">
                  <div className="report-stat">
                    <div
                      className="report-stat-value"
                      style={{ color: isError ? 'var(--accent-red)' : 'var(--accent-blue)' }}
                    >
                      {report.durationMinutes}
                    </div>
                    <div className="report-stat-label">min</div>
                  </div>
                  <div className="report-stat">
                    <div
                      className="report-stat-value"
                      style={{ color: isError ? 'var(--accent-red)' : 'var(--accent-green)' }}
                    >
                      ${Number(report.cost || 0).toFixed(3)}
                    </div>
                    <div className="report-stat-label">cost</div>
                  </div>
                  <div className="report-stat">
                    <div
                      className="report-stat-value"
                      style={{ color: isError ? 'var(--accent-red)' : 'var(--accent-orange)' }}
                    >
                      {report.stepsCompleted}/{report.totalSteps}
                    </div>
                    <div className="report-stat-label">steps</div>
                  </div>
                </div>

                {isError ? (
                  <div
                    className="report-files"
                    style={{ background: 'rgba(244, 67, 54, 0.15)', padding: '8px', borderRadius: '6px', marginBottom: '10px' }}
                  >
                    <div className="report-files-title" style={{ color: 'var(--accent-red)' }}>⚠️ Execution Failed</div>
                  </div>
                ) : null}

                {report.outputFiles && report.outputFiles.length > 0 &&
                !report.outputFiles.includes('No files generated') &&
                !report.outputFiles.includes('No files generated - execution failed') ? (
                  <div className="report-files">
                    <div className="report-files-header">
                      <div className="report-files-title">📁 Output Files:</div>
                      <button
                        className="report-finder-btn"
                        type="button"
                        title="Open in Finder"
                        onClick={(e) => {
                          e.stopPropagation()
                          const firstFile = report.outputFiles[0]
                          client.post('/utils/open-in-finder', { filePath: firstFile }).catch(() => {})
                        }}
                      >
                        📂
                      </button>
                    </div>
                    <div className="report-file-list">
                      {report.outputFiles.slice(0, 3).map((file) => (
                        <span key={file} className="report-file-tag">{file.split('/').pop()}</span>
                      ))}
                      {report.outputFiles.length > 3 ? (
                        <span className="report-file-tag">+{report.outputFiles.length - 3} more</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="report-footer">
                  <span>{isError ? 'Failed' : 'Completed'}: {new Date(report.archivedAt).toLocaleDateString()}</span>
                  <span>{report.agentType || 'auto'}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ReportsBar
