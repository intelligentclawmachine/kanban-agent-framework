import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useReports } from '../../hooks/useReports'
import { useUpdateTask } from '../../hooks/useTasks'
import { useUIStore } from '../../store/uiStore'
import client from '../../api/client'

function ReportsPage() {
  const { data, isLoading } = useReports()
  const reports = data?.reports || []
  const openReportModal = useUIStore((state) => state.openReportModal)
  const toggleArchive = useUIStore((state) => state.toggleArchive)
  const updateTask = useUpdateTask()
  const queryClient = useQueryClient()

  const totalCost = reports.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalDuration = reports.reduce((sum, r) => sum + (r.durationMinutes || 0), 0)
  const errorCount = reports.filter(
    (r) => r.error || r.whatWasAccomplished?.includes('EXECUTION FAILED')
  ).length

  const handleReturnToBoard = (e, report) => {
    e.stopPropagation()
    if (!report.taskId) return
    updateTask.mutate(
      { id: report.taskId, updates: { status: 'backlog', executionStatus: null, completionSummary: null } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }) }
    )
  }

  return (
    <div className="sessions-page">
      {/* Summary Stats as Metric Cards */}
      <div className="metrics-strip-new">
        <div className="metrics-carousel">
          <article className="metric-card-new metric-info">
            <div className="metric-icon">📊</div>
            <div className="metric-text">
              <p className="metric-label">Total Reports</p>
              <h3 className="metric-value-new">{reports.length}</h3>
            </div>
          </article>
          <article className="metric-card-new metric-success">
            <div className="metric-icon">✅</div>
            <div className="metric-text">
              <p className="metric-label">Succeeded</p>
              <h3 className="metric-value-new">{reports.length - errorCount}</h3>
            </div>
          </article>
          <article className="metric-card-new metric-danger">
            <div className="metric-icon">❌</div>
            <div className="metric-text">
              <p className="metric-label">Failed</p>
              <h3 className="metric-value-new">{errorCount}</h3>
            </div>
          </article>
          <article className="metric-card-new metric-warning">
            <div className="metric-icon">💰</div>
            <div className="metric-text">
              <p className="metric-label">Total Cost</p>
              <h3 className="metric-value-new">${totalCost.toFixed(3)}</h3>
            </div>
          </article>
          <article className="metric-card-new metric-info">
            <div className="metric-icon">⏱</div>
            <div className="metric-text">
              <p className="metric-label">Total Duration</p>
              <h3 className="metric-value-new">{totalDuration.toFixed(1)}m</h3>
            </div>
          </article>
        </div>
      </div>

      <section className="sessions-page-section">
        <div className="section-header">
          <h2>Execution Reports</h2>
          <span className="agent-count">{reports.length}</span>
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
          <div className="reports-list">
            {reports.map((report) => {
              const isError =
                report.error || report.whatWasAccomplished?.includes('EXECUTION FAILED')
              return (
                <div
                  key={report.id}
                  className={`report-list-row ${isError ? 'report-list-row--error' : ''}`}
                  onClick={() => openReportModal(report)}
                >
                  <div className="report-list-status">
                    {isError ? '❌' : '✅'}
                  </div>
                  <div className="report-list-title">
                    {report.title}
                  </div>
                  <div className="report-list-stats">
                    <span className="report-list-stat">
                      <span className="report-list-stat-value">{report.durationMinutes}</span>
                      <span className="report-list-stat-label">min</span>
                    </span>
                    <span className="report-list-stat">
                      <span className="report-list-stat-value">${Number(report.cost || 0).toFixed(3)}</span>
                      <span className="report-list-stat-label">cost</span>
                    </span>
                    <span className="report-list-stat">
                      <span className="report-list-stat-value">{report.stepsCompleted}/{report.totalSteps}</span>
                      <span className="report-list-stat-label">steps</span>
                    </span>
                  </div>
                  <div className="report-list-meta">
                    <span>{new Date(report.archivedAt).toLocaleDateString()}</span>
                    <span className="report-list-agent">{report.agentType || 'auto'}</span>
                  </div>
                  <div className="report-list-actions">
                    <button
                      className="btn btn-small btn-secondary"
                      type="button"
                      title="View report details"
                      onClick={(e) => {
                        e.stopPropagation()
                        openReportModal(report)
                      }}
                    >
                      View
                    </button>
                    {report.taskId && (
                      <button
                        className="btn btn-small btn-primary"
                        type="button"
                        title="Return task to backlog for re-execution"
                        onClick={(e) => handleReturnToBoard(e, report)}
                      >
                        Return to Board
                      </button>
                    )}
                    {report.outputFiles &&
                      report.outputFiles.length > 0 &&
                      !report.outputFiles.includes('No files generated') &&
                      !report.outputFiles.includes('No files generated - execution failed') && (
                        <button
                          className="btn btn-small btn-secondary"
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
                      )}
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
