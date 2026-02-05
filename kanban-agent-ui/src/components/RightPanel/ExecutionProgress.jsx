import React from 'react'
import './ExecutionProgress.css'

function ExecutionProgress() {
  return (
    <div className="execution-progress" id="executionProgress">
      <div className="execution-progress-header">
        <div className="execution-progress-title">Execution Progress</div>
        <button className="execution-progress-close" type="button">×</button>
      </div>
      <div className="execution-progress-bar">
        <div className="execution-progress-fill" id="executionProgressFill" style={{ width: '0%' }} />
      </div>
      <div className="execution-progress-text" id="executionProgressText">Starting...</div>
    </div>
  )
}

export default ExecutionProgress
