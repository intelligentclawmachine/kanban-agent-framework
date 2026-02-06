import React from 'react'
import { useUIStore } from '../../store/uiStore'
import client from '../../api/client'
import './ReportModal.css'

/**
 * Clean raw summary text by removing JSON metadata artifacts.
 * Agent responses embed massive JSON metadata blocks (agent config, system prompts,
 * tool schemas, etc.) between step outputs. This strips all of that.
 */
function cleanRawText(text) {
  if (!text) return ''

  let cleaned = text

  // Primary cleanup: Remove everything between end-of-step JSON closing and next step marker.
  // Pattern: after a step's content ends with `"`, there's `"mediaUrl": null` then massive JSON,
  // followed by the next `✓` or end of string.
  cleaned = cleaned.replace(/",?\s*"mediaUrl"[\s\S]*?(?=✓|$)/g, '\n')

  // Remove any remaining JSON blocks with "meta": { ... } patterns
  cleaned = cleaned.replace(/"meta"\s*:\s*\{[\s\S]*?\}\s*\}/g, '')

  // Remove JSON key-value artifacts that may remain
  cleaned = cleaned.replace(/"[a-zA-Z_]+"\s*:\s*(null|true|false|"[^"]*"|\d+)\s*,?/g, '')
  cleaned = cleaned.replace(/^\s*[\[\]{}]\s*$/gm, '')
  cleaned = cleaned.replace(/\{\s*\}/g, '')
  cleaned = cleaned.replace(/\[\s*\]/g, '')

  // Clean escaped newlines and quotes
  cleaned = cleaned.replace(/\\n/g, '\n')
  cleaned = cleaned.replace(/\\"/g, '"')

  // Remove excess blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned.trim()
}

/**
 * Parse cleaned summary text into structured step sections
 */
function parseSummarySteps(text) {
  if (!text) return []

  const cleaned = cleanRawText(text)

  // Split on step markers: "✓ Step Title:" pattern
  const stepPattern = /✓\s+([^:]+):\s*/g
  const parts = cleaned.split(stepPattern)

  // If no step markers found, return as a single block
  if (parts.length <= 1) {
    return [{ title: null, content: cleaned }]
  }

  const steps = []
  // parts[0] is text before first ✓ (usually empty)
  // Then pairs of [title, content]
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i]?.trim()
    let content = (parts[i + 1] || '').trim()

    // Extract sub-fields from content
    const fields = {}

    // Extract Files Created
    const filesMatch = content.match(/Files Created:\s*([\s\S]*?)(?=(?:URLs:|Notes:|$))/i)
    if (filesMatch) {
      const filesText = filesMatch[1].trim()
      if (filesText && filesText !== 'None' && !filesText.startsWith('No files')) {
        fields.files = filesText.split(/\n/).map(f => f.replace(/^[-\s]+/, '').trim()).filter(f => f)
      }
    }

    // Extract URLs
    const urlsMatch = content.match(/URLs:\s*([\s\S]*?)(?=(?:Notes:|$))/i)
    if (urlsMatch) {
      const urlsText = urlsMatch[1].trim()
      if (urlsText && urlsText !== 'None') {
        fields.urls = urlsText.split(/\n/).map(u => u.trim()).filter(u => u)
      }
    }

    // Extract Notes
    const notesMatch = content.match(/Notes:\s*([\s\S]*?)$/i)
    if (notesMatch) {
      const notesText = notesMatch[1].trim()
      if (notesText && notesText !== 'None') {
        fields.notes = notesText
      }
    }

    // Get the main description (content before Files Created/URLs/Notes)
    let description = content
      .replace(/Files Created:[\s\S]*$/i, '')
      .replace(/URLs:[\s\S]*$/i, '')
      .replace(/Notes:[\s\S]*$/i, '')
      .trim()

    steps.push({ title, description, ...fields })
  }

  return steps
}

function openInFinder(filePath) {
  client.post('/utils/open-in-finder', { filePath }).catch((err) => {
    console.error('Failed to open in Finder:', err)
  })
}

function ReportModal() {
  const { reportModalOpen, reportModalData, closeReportModal } = useUIStore()

  if (!reportModalOpen || !reportModalData) return null

  const report = reportModalData
  const isError = report.error || report.whatWasAccomplished?.includes('❌ EXECUTION FAILED')

  const summarySteps = parseSummarySteps(report.whatWasAccomplished)
  const hasFiles = report.outputFiles?.length > 0 &&
    !report.outputFiles.includes('No files generated') &&
    !report.outputFiles.includes('No files generated - execution failed')
  const hasUrls = report.urls?.length > 0

  return (
    <div className="modal-overlay active" onClick={closeReportModal}>
      <div className="modal report-modal" onClick={(event) => event.stopPropagation()}>
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
            marginBottom: '16px',
          }}
        >
          <h3 style={{ color: isError ? 'var(--accent-red)' : 'var(--accent-green)', marginBottom: '16px' }}>
            {isError ? '❌ ' : '✅ '}{report.title}
          </h3>

          {report.description && (
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontStyle: 'italic' }}>
              {report.description}
            </p>
          )}

          <div className="report-stats-row" style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
            <div>
              <strong>Duration:</strong> {report.durationMinutes} min
            </div>
            <div>
              <strong>Cost:</strong> ${Number(report.cost || 0).toFixed(3)}
            </div>
            <div>
              <strong>Steps:</strong> {report.stepsCompleted}/{report.totalSteps}
            </div>
          </div>
        </div>

        {hasFiles && (
          <div className="detail-section" style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>📁 Output Files</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {report.outputFiles.map((file, idx) => (
                <div key={idx} className="report-file-row">
                  <code className="report-file-path">{file}</code>
                  <button
                    className="finder-btn"
                    type="button"
                    title="Reveal in Finder"
                    onClick={(e) => { e.stopPropagation(); openInFinder(file); }}
                  >
                    📂 Open
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasUrls && (
          <div className="detail-section" style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>🔗 URLs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {report.urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-blue)', fontSize: '13px' }}
                >
                  {url}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="detail-section">
          <h4 style={{ marginBottom: '12px' }}>📝 Summary</h4>
          {summarySteps.length === 0 ? (
            <div className="summary-section-content">No summary available</div>
          ) : summarySteps.length === 1 && !summarySteps[0].title ? (
            <div className="summary-section-content">
              {summarySteps[0].content}
            </div>
          ) : (
            summarySteps.map((step, idx) => (
              <div key={idx} className="summary-section">
                {idx > 0 && <hr className="summary-divider" />}
                <div className="summary-section-title">
                  Step {idx + 1}: {step.title}
                </div>
                {step.description && (
                  <div className="summary-section-content">{step.description}</div>
                )}
                {step.files && step.files.length > 0 && (
                  <div className="summary-field">
                    <span className="summary-field-label">Files:</span>
                    {step.files.map((f, fi) => (
                      <div key={fi} className="report-file-row" style={{ marginTop: '4px' }}>
                        <code className="report-file-path">{f}</code>
                        <button
                          className="finder-btn"
                          type="button"
                          title="Reveal in Finder"
                          onClick={(e) => { e.stopPropagation(); openInFinder(f); }}
                        >
                          📂
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {step.notes && (
                  <div className="summary-field">
                    <span className="summary-field-label">Notes:</span>
                    <span className="summary-field-value">{step.notes}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="detail-section" style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div>Created: {new Date(report.created).toLocaleString()}</div>
          <div>Completed: {new Date(report.archivedAt).toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
