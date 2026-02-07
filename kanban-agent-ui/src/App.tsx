import { useMemo, useState } from 'react'
import './App.css'

type MetricStatus = 'success' | 'warning' | 'danger' | 'info'
type TaskStatus = 'idle' | 'running' | 'error' | 'success'

type TaskCard = {
  id: string
  title: string
  description: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: TaskStatus
  expected: string
  attachments: number
}

type ColumnDefinition = {
  id: string
  title: string
  subtitle: string
  empty: string
  tasks: TaskCard[]
}

type Agent = {
  name: string
  status: 'healthy' | 'warning' | 'error'
  timer: string
  step: string
  model: string
}

type PastSession = {
  title: string
  time: string
  cost: string
  tokens: string
  status: 'success' | 'warning'
}

type Report = {
  title: string
  detail: string
  status: 'success' | 'error'
  files: number
}

type ArchiveItem = {
  title: string
  priority: string
  note: string
  date: string
}

type EventCard = {
  time: string
  title: string
  detail: string
  severity: 'info' | 'warning' | 'error'
}

const metricCards: { label: string; value: string; detail: string; status: MetricStatus }[] = [
  { label: 'Goal health', value: '78%', detail: 'Focus lane steady · 2 blockers', status: 'success' },
  { label: 'Active executions', value: '14', detail: '4 plan ready · 2 running', status: 'info' },
  { label: 'Stalled approvals', value: '02', detail: 'Awaiting plan review', status: 'warning' },
  { label: 'Throughput (24h)', value: '9', detail: '+3 vs yesterday', status: 'success' },
]

const filterOptions = ['All', 'P0', 'P1', 'P2', 'P3'] as const
const quickActions = [
  { label: 'Command palette', icon: '⌘', helper: '⌘K' },
  { label: 'Shortcuts', icon: '⚡', helper: 'Alt /' },
  { label: 'Theme', icon: '🌓', helper: 'Ctrl+T' },
]

const columns: ColumnDefinition[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    subtitle: 'Ideas waiting for planning',
    empty: 'Startup tasks will appear here →',
    tasks: [
      {
        id: 'BL-01',
        title: 'Surface plan review blockers',
        description: 'Audit paused plans and capture missing approvals for the cabinet.',
        priority: 'P1',
        status: 'idle',
        expected: 'Update plan, ping reviewer',
        attachments: 2,
      },
      {
        id: 'BL-05',
        title: 'Script Dr. Kanban onboarding',
        description: 'Draft onboarding doc with CLI commands + role checklist.',
        priority: 'P2',
        status: 'idle',
        expected: 'Doc + checklist',
        attachments: 1,
      },
      {
        id: 'BL-03',
        title: 'Audit drag-drop targets',
        description: 'Record overlays for drop zone QA and future interactions.',
        priority: 'P3',
        status: 'idle',
        expected: 'Notes + tests',
        attachments: 0,
      },
    ],
  },
  {
    id: 'today',
    title: 'Today',
    subtitle: 'Sprint flow · focus lane above',
    empty: 'No tasks scheduled for today yet',
    tasks: [
      {
        id: 'TD-07',
        title: 'Deploy drift mitigation',
        description: 'Move plan-ready drift mitigations into the execution cluster.',
        priority: 'P1',
        status: 'running',
        expected: 'Monitor logs · attach report',
        attachments: 3,
      },
      {
        id: 'TD-02',
        title: 'Agent health warning badge',
        description: 'Investigate why the health dot flipped to amber twice this hour.',
        priority: 'P0',
        status: 'error',
        expected: 'Capture logs + fallback',
        attachments: 4,
      },
      {
        id: 'TD-11',
        title: 'Update reports deck',
        description: 'Add throughput metrics + error summary from yesterday’s run.',
        priority: 'P2',
        status: 'idle',
        expected: 'Refresh deck + share link',
        attachments: 1,
      },
    ],
  },
  {
    id: 'tomorrow',
    title: 'Tomorrow',
    subtitle: 'Ready for scheduling',
    empty: 'Schedule work to make it appear here',
    tasks: [
      {
        id: 'TM-19',
        title: 'Archive stale outputs',
        description: 'Cleanup plan artifacts older than 2 weeks and archive summaries.',
        priority: 'P1',
        status: 'idle',
        expected: 'Archive log + update cost',
        attachments: 2,
      },
      {
        id: 'TM-21',
        title: 'Plan-first gating review',
        description: 'Double-check plan review flags still block execution as expected.',
        priority: 'P1',
        status: 'idle',
        expected: 'Update gating matrix',
        attachments: 0,
      },
    ],
  },
]

const focusLaneTasks: TaskCard[] = [
  {
    id: 'FO-01',
    title: 'Kill stalled encoder run',
    description: 'Execution stalled for 45m; needs investigator approval before kill.',
    priority: 'P0',
    status: 'running',
    expected: 'Confirm kill outcome',
    attachments: 2,
  },
  {
    id: 'FO-03',
    title: 'Review Kimi’s plan summary',
    description: 'Plan mentions 3 unknown steps; add details and requeue.',
    priority: 'P0',
    status: 'idle',
    expected: 'Plan review + reassign',
    attachments: 1,
  },
]

const activeAgents: Agent[] = [
  { name: 'Agent Kimi', status: 'healthy', timer: '12m', step: 'Plan review', model: 'Claude Sonnet 4.5' },
  { name: 'Agent Orion', status: 'warning', timer: '04m', step: 'Executing', model: 'GPT-5.2 Codex' },
  { name: 'Agent Vega', status: 'error', timer: '02m', step: 'Recovering', model: 'Kimi K2.5' },
]

const pastSessions: PastSession[] = [
  { title: 'TD-04 · Explorer', time: '13:12', cost: '$0.38', tokens: '3.2K', status: 'success' },
  { title: 'TD-06 · Drift audit', time: '12:54', cost: '$0.42', tokens: '3.8K', status: 'success' },
  { title: 'BL-08 · Archive prune', time: '11:40', cost: '$0.92', tokens: '5.4K', status: 'warning' },
]

const reports: Report[] = [
  { title: 'Cost spike · Beacon 3', detail: 'Torch model tokens hit 5.4K, +28%', status: 'error', files: 3 },
  { title: 'Execution summary', detail: '7 completions · 3 warnings', status: 'success', files: 2 },
]

const archiveItems: ArchiveItem[] = [
  { title: 'Legacy hero hook', priority: 'P2', note: 'Revisit once guardrails live', date: 'Feb 2' },
  { title: 'Old onboarding plan', priority: 'P3', note: 'Delete after review', date: 'Jan 28' },
  { title: 'Drift PR draft', priority: 'P1', note: 'Restore for Kimi audit', date: 'Jan 25' },
]

const events: EventCard[] = [
  { time: '13:24', title: 'Plan approved', detail: 'Review locked and approved for TD-07', severity: 'info' },
  { time: '13:12', title: 'Agent Vega slowed', detail: 'Elapsed timer stalled; manual check recommended', severity: 'warning' },
  { time: '12:57', title: 'Archive cleared', detail: '3 outputs deleted, 2 restored', severity: 'info' },
  { time: '12:30', title: 'KPI goal dropped', detail: 'Goal health dipped from 82% → 78%', severity: 'warning' },
]

const navViews = ['Kanban', 'Agent Manager'] as const

function App() {
  const [activeFilter, setActiveFilter] = useState<typeof filterOptions[number]>('All')
  const [view, setView] = useState<typeof navViews[number]>('Kanban')
  const [isArchiveOpen, setArchiveOpen] = useState(false)

  const filteredColumns = useMemo(() => {
    if (activeFilter === 'All') {
      return columns
    }
    return columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) => task.priority === activeFilter),
    }))
  }, [activeFilter])

  const filteredFocusLane = useMemo(() => {
    if (activeFilter === 'All') return focusLaneTasks
    return focusLaneTasks.filter((task) => task.priority === activeFilter)
  }, [activeFilter])

  const goalProgress = 72

  return (
    <div className="kanban-app">
      <header className="kanban-header">
        <div className="title-group">
          <div className="brand">
            <span className="brand-dot" aria-hidden />
            <span className="brand-text">Kanban Dashboard</span>
          </div>
          <div className="view-switcher" role="tablist" aria-label="Primary views">
            {navViews.map((option) => (
              <button
                key={option}
                type="button"
                className={`view-button ${view === option ? 'active' : ''}`}
                aria-pressed={view === option}
                onClick={() => setView(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="header-actions">
          <span className="sync-indicator">Synced ▸ 13:26</span>
          <label className="search-field">
            <span aria-hidden>⌕</span>
            <input placeholder="Search tasks or agents" aria-label="Search" />
          </label>
          <button className="ghost-button" type="button">
            Refresh
          </button>
          <button className="accent-button" type="button">
            + New Task
          </button>
          <div className="icon-group" aria-label="Quick access">
            {quickActions.map((action) => (
              <button key={action.label} className="icon-button" type="button" aria-label={action.label}>
                <span aria-hidden>{action.icon}</span>
                <span className="icon-hint">{action.helper}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="metrics-strip" aria-label="Goal metrics">
        {metricCards.map((metric) => (
          <article key={metric.label} className={`metric-card ${metric.status}`}>
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
            <p className="metric-detail">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="goal-spotlight">
        <div>
          <p className="goal-label">Sprint goal · Execution readiness</p>
          <h2>Keep plan-first approvals above 90%</h2>
          <p className="goal-subtext">Focus lane keeps P0 tasks airborne while the rail monitors agents.</p>
        </div>
        <div className="goal-progress">
          <div className="progress-track" aria-hidden>
            <div className="progress-fill" style={{ width: `${goalProgress}%` }} />
          </div>
          <div className="progress-meta">
            <span>Goal health {goalProgress}%</span>
            <span className="goal-detail">2 blockers · 8 targets remaining</span>
          </div>
        </div>
      </section>

      <section className="filter-row">
        <div className="filter-chips" role="group" aria-label="Priority filters">
          {filterOptions.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`filter-chip ${activeFilter === chip ? 'active' : ''}`}
              onClick={() => setActiveFilter(chip)}
              aria-pressed={activeFilter === chip}
            >
              {chip}
            </button>
          ))}
        </div>
        <button className="pill-button" type="button">
          Today highlight
        </button>
      </section>

      <section className="kanban-grid">
        <div className="kanban-board">
          <div className="columns-snap" role="list">
            {filteredColumns.map((column) => (
              <article className="kanban-column" key={column.id} data-column={column.id} role="listitem">
                <header className="column-header">
                  <div>
                    <p className="column-subtitle">{column.subtitle}</p>
                    <h3>{column.title}</h3>
                  </div>
                  <span className="column-count">{column.tasks.length}</span>
                </header>

                {column.id === 'today' && (
                  <div className="focus-lane" aria-label="Focus lane">
                    <div className="focus-lane-heading">
                      <span>Focus lane</span>
                      <small>Urgent P0 · higher elevation</small>
                    </div>
                    <div className="focus-list">
                      {filteredFocusLane.length === 0 && <p className="empty-state">No focus tasks for this filter</p>}
                      {filteredFocusLane.map((task) => (
                        <article key={task.id} className={`task-card focus ${task.status}`}>
                          <div className="task-row">
                            <p className="task-id">{task.id}</p>
                            <span className="status-pill"><span className="dot" />{task.status}</span>
                          </div>
                          <h4>{task.title}</h4>
                          <p className="task-description">{task.description}</p>
                          <div className="task-meta">
                            <span>{task.attachments} attachments</span>
                            <span>{task.expected}</span>
                          </div>
                          <button className="task-action" type="button" aria-label="Start focus task">
                            {task.status === 'running' ? '⏳ Running' : '▶ Start'}
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                <div className="task-list">
                  {column.tasks.length === 0 ? (
                    <p className="empty-state">{column.empty}</p>
                  ) : (
                    column.tasks.map((task) => (
                      <article key={task.id} className={`task-card ${task.status}`}>
                        <div className="task-row">
                          <p className="task-id">{task.id}</p>
                          <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                        </div>
                        <h4>{task.title}</h4>
                        <p className="task-description">{task.description}</p>
                        <div className="task-meta">
                          <span>{task.attachments} attachments</span>
                          <span>{task.expected}</span>
                        </div>
                        <div className="task-actions">
                          <button
                            className="task-start"
                            type="button"
                            aria-label={`Start ${task.id}`}
                            disabled={task.status === 'running'}
                          >
                            {task.status === 'running' ? '⏳ Running' : '▶ Start'}
                          </button>
                          <button className="task-secondary" type="button">
                            View results
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div className="column-footer">
                  <button className="ghost-icon" type="button" aria-label="Add task">
                    + Add task
                  </button>
                  <span className="column-hint">Drag overlay keeps columns aware</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="right-rail" aria-label="Monitoring rail">
          <section className="rail-section">
            <div className="rail-header">
              <div>
                <p className="rail-title">Active agents</p>
                <p className="rail-subtitle">Real-time health + step</p>
              </div>
              <button className="icon-small" type="button" aria-label="Refresh agents">
                ⟳
              </button>
            </div>
            <div className="rail-body">
              {activeAgents.map((agent) => (
                <article key={agent.name} className="agent-card">
                  <div className="agent-row">
                    <span className={`agent-dot ${agent.status}`} aria-hidden />
                    <div>
                      <p className="agent-name">{agent.name}</p>
                      <p className="agent-detail">{agent.step}</p>
                    </div>
                  </div>
                  <div className="agent-meta">
                    <span>{agent.timer}</span>
                    <span>{agent.model}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rail-section">
            <div className="rail-header">
              <div>
                <p className="rail-title">Past sessions</p>
                <p className="rail-subtitle">Cost · tokens</p>
              </div>
              <button className="icon-small" type="button" aria-label="Refresh sessions">
                ⟳
              </button>
            </div>
            <div className="rail-body">
              {pastSessions.map((session) => (
                <article key={session.title} className="session-card">
                  <div className="session-row">
                    <span className={`session-dot ${session.status}`} aria-hidden />
                    <p>{session.title}</p>
                  </div>
                  <div className="session-meta">
                    <span>{session.time}</span>
                    <span>{session.cost}</span>
                    <span>{session.tokens} tokens</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rail-section">
            <div className="rail-header">
              <div>
                <p className="rail-title">Reports</p>
                <p className="rail-subtitle">Errors & summaries</p>
              </div>
              <button className="icon-small" type="button" aria-label="Refresh reports">
                ⟳
              </button>
            </div>
            <div className="rail-body">
              {reports.map((report) => (
                <article key={report.title} className={`report-card ${report.status}`}>
                  <div className="report-row">
                    <p>{report.title}</p>
                    <span className="report-files">{report.files} files</span>
                  </div>
                  <p className="report-detail">{report.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="event-progress">
        <div className="event-stream" aria-live="polite">
          <header>
            <h3>Event stream</h3>
            <button className="ghost-icon" type="button" aria-label="Clear events">
              ✕
            </button>
          </header>
          <div className="event-list">
            {events.map((event) => (
              <article key={`${event.time}-${event.title}`} className={`event-card ${event.severity}`}>
                <p className="event-time">{event.time}</p>
                <p className="event-title">{event.title}</p>
                <p className="event-detail">{event.detail}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="execution-progress">
          <p className="rail-title">Execution progress</p>
          <p className="rail-subtitle">Plan &rarr; Execution &rarr; Archive</p>
          <div className="progress-track" aria-hidden>
            <div className="progress-fill" style={{ width: '68%' }} />
          </div>
          <p className="progress-status">68% complete · 12 steps logged</p>
          <button className="pill-button" type="button">
            View timeline
          </button>
        </div>
      </section>

      <button className="archive-button" type="button" onClick={() => setArchiveOpen(true)}>
        Archive panel
      </button>

      <div className="toast-spot" role="status" aria-live="polite">
        Toasts appear here (success · error) for actions like kill + delete.
      </div>

      {isArchiveOpen && (
        <div className="archive-modal" role="dialog" aria-modal="true">
          <div className="archive-overlay" onClick={() => setArchiveOpen(false)} aria-hidden />
          <div className="archive-panel">
            <header>
              <h3>Archive</h3>
              <p>Restore or delete historical executions</p>
              <button className="ghost-icon" type="button" onClick={() => setArchiveOpen(false)} aria-label="Close archive">
                ✕
              </button>
            </header>
            <div className="archive-list">
              {archiveItems.map((item) => (
                <article key={item.title} className="archive-item">
                  <div>
                    <p className="archive-title">{item.title}</p>
                    <p className="archive-note">{item.note}</p>
                  </div>
                  <div className="archive-meta">
                    <span className="priority-dot">{item.priority}</span>
                    <span>{item.date}</span>
                  </div>
                  <div className="archive-actions">
                    <button type="button" className="pill-button">
                      Restore
                    </button>
                    <button type="button" className="ghost-button">
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
