import React from 'react'
import { useReports } from '../../hooks/useReports'
import { useUIStore } from '../../store/uiStore'
import client from '../../api/client'

function ReportsPage() {
  const { data, refetch, isLoading } = useReports()
  const reports = data?.reports || []
  const openReportModal = useUIStore((state) => state.openReportModal)
  const toggleArchive = useUIStore((state) => state.toggleArchive)

  const totalCost = reports.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalDuration = reports.reduce((sum, r) => sum + (r.durationMinutes || 0), 0)
  const errorCount = reports.filter(
    (r) => r.error || r.whatWasAccomplished?.includes('EXECUTION FAILED')
  ).length

  return (
    <div className="sessions-page">
      {/* Summary Stats */}
      <div className="sessions-summary-bar">
        <div className="summary-stat">
          <span className="summary-stat-value">{reports.length}</span>
          <span className="summary-stat-label">Total Reports</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value" style={{ color: 'var(--accent-green)' }}>
            {reports.length - errorCount}
          </span>
          <span className="summary-stat-label">Succeeded</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value" style={{ color: 'var(--accent-red)' }}>
            {errorCount}
          </span>
          <span className="summary-stat-label">Failed</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">${totalCost.toFixed(3)}</span>
          <span className="summary-stat-label">Total Cost</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{totalDuration.toFixed(1)}m</span>
          <span className="summary-stat-label">Total Duration</span>
        </div>
      </div>

      <section className="sessions-page-section">
        <div className="section-header">
          <h2>Execution Reports</h2>
          <span className="agent-count">{reports.length}</span>
          <button className="btn btn-small btn-secondary" type="button" onClick={() => refetch()}>
            Refresh
          </button>
          <button className="btn btn-small btn-secondary" type="button" onClick={toggleArchive}>
            Archive
          </button>
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '24px', textAlign: 'center' }}>
            Loading reports...
          </p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <p>No completed reports yet</p>
            <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
              Execute tasks to see reports here
            </p>
          </div>
        ) : (
          <div className="sessions-page-grid">
            {reports.map((report) => {
              const isError =
                report.error || report.whatWasAccomplished?.includes('EXECUTION FAILED')
              return (
                <div
                  key={report.id}
                  className="report-page-card"
                  style={{
                    borderLeftColor: isError ? 'var(--accent-red)' : 'var(--accent-green)',
                    background: isError ? 'rgba(244, 67, 54, 0.06)' : undefined,
                  }}
                  onClick={() => openReportModal(report)}
                >
                  <div className="report-header">
                    <div className="report-title">
                      {isError ? '❌ ' : ''}
                      {report.title}
                    </div>
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

                  {isError && (
                    <div
                      style={{
                        background: 'rgba(244, 67, 54, 0.15)',
                        padding: '8px',
                        borderRadius: '6px',
                        marginBottom: '10px',
                        fontSize: '12px',
                        color: 'var(--accent-red)',
                      }}
                    >
                      Execution Failed
                    </div>
                  )}

                  {report.outputFiles &&
                    report.outputFiles.length > 0 &&
                    !report.outputFiles.includes('No files generated') &&
                    !report.outputFiles.includes('No files generated - execution failed') && (
                      <div className="report-files">
                        <div className="report-files-header">
                          <div className="report-files-title">Output Files:</div>
                          <button
                            className="report-finder-btn"
                            type="button"
                            title="Open in Finder"
                            onClick={(e) => {
                              e.stopPropagation()
                              client
                                .post('/utils/open-in-finder', {
                                  filePath: report.outputFiles[0],
                                })
                                .catch(() => {})
                            }}
                          >
                            📂
                          </button>
                        </div>
                        <div className="report-file-list">
                          {report.outputFiles.slice(0, 3).map((file) => (
                            <span key={file} className="report-file-tag">
                              {file.split('/').pop()}
                            </span>
                          ))}
                          {report.outputFiles.length > 3 && (
                            <span className="report-file-tag">
                              +{report.outputFiles.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  <div className="report-footer">
                    <span>
                      {isError ? 'Failed' : 'Completed'}:{' '}
                      {new Date(report.archivedAt).toLocaleDateString()}
                    </span>
                    <span>{report.agentType || 'auto'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default ReportsPage
