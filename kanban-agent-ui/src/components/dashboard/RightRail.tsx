import React from 'react'
import {
  AgentCard,
  MonitoringCard,
  ReportItem,
  SessionRecord,
} from '../../types/dashboard'

interface RightRailProps {
  activeAgents: AgentCard[]
  pastSessions: SessionRecord[]
  reports: ReportItem[]
  monitoring: MonitoringCard[]
}

const RightRail: React.FC<RightRailProps> = ({
  activeAgents,
  pastSessions,
  reports,
  monitoring,
}) => {
  return (
    <aside className="right-rail" aria-label="Monitoring and reports">
      <section className="rail-module" aria-labelledby="active-agents-title">
        <div className="rail-header">
          <h3 id="active-agents-title">Active agents</h3>
          <button type="button" className="ghost-mini">
            Refresh
          </button>
        </div>
        <div className="rail-card-stack">
          {activeAgents.map((agent) => (
            <article key={agent.id} className={`rail-card rail-card-${agent.tone}`}>
              <div className="card-header">
                <div>
                  <p className="card-title">{agent.name}</p>
                  <p className="card-subtitle">{agent.stage}</p>
                </div>
                <span className={`status-dot status-${agent.tone}`} aria-label={`Status ${agent.statusLabel}`}></span>
              </div>
              <p className="card-meta">{agent.model}</p>
              <p className="card-meta">Elapsed {agent.timer}</p>
              <div className="card-actions">
                <button type="button" className="ghost-mini">
                  Pause
                </button>
                <button type="button" className="danger-mini">
                  Kill
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rail-module" aria-labelledby="past-sessions-title">
        <div className="rail-header">
          <h3 id="past-sessions-title">Past sessions</h3>
          <button type="button" className="ghost-mini">
            Refresh
          </button>
        </div>
        <div className="session-stack">
          {pastSessions.map((session) => (
            <article key={session.id} className={`session-card session-${session.statusTone}`}>
              <div className="card-header">
                <p className="card-title">{session.name}</p>
                <span className={`status-dot status-${session.statusTone}`} aria-label={`Status ${session.status}`}></span>
              </div>
              <p className="session-meta">{session.duration} • {session.cost}</p>
              <p className="session-meta">Tokens • {session.tokens}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rail-module" aria-labelledby="reports-title">
        <div className="rail-header">
          <h3 id="reports-title">Reports</h3>
          <button type="button" className="ghost-mini">
            Archive
          </button>
        </div>
        <div className="report-stack">
          {reports.map((report) => (
            <article key={report.id} className={`report-card report-${report.statusTone}`}>
              <p className="report-title">{report.title}</p>
              <p className="report-summary">{report.summary}</p>
              <div className="report-stats">
                {report.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="report-stat-value">{stat.value}</p>
                    <p className="report-stat-label">{stat.label}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rail-module" aria-labelledby="monitoring-title">
        <div className="rail-header">
          <h3 id="monitoring-title">Monitoring</h3>
          <button type="button" className="ghost-mini">
            View
          </button>
        </div>
        <div className="monitoring-stack">
          {monitoring.map((item) => (
            <article key={item.id} className={`monitor-card monitor-${item.tone}`}>
              <p className="monitor-title">{item.title}</p>
              <p className="monitor-metric">{item.metric}</p>
              <p className="monitor-delta">{item.delta}</p>
            </article>
          ))}
        </div>
      </section>
    </aside>
  )
}

export default RightRail
