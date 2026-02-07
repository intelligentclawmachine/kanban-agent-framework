import {
  AgentCard,
  ArchiveItem,
  FilterKey,
  FocusLane,
  KanbanColumn,
  MetricCard,
  MonitoringCard,
  ReportItem,
  SessionRecord,
  ToastMessage,
} from '../types/dashboard'

export const goalSpotlight = {
  title: 'Launch readiness review',
  description: 'Coordinate analytics, docs, and QA feedback for the 09:00 release window.',
  percent: 68,
  healthLabel: 'Health waning – plan review pending',
  stalled: 3,
}

export const metricCards: MetricCard[] = [
  {
    id: 'goal-health',
    label: 'Goal health',
    value: '68%',
    delta: '-6% vs last week',
    tone: 'warning',
    description: 'Sprint objective is behind by 2 tasks.',
    icon: '🎯',
  },
  {
    id: 'throughput',
    label: 'Throughput',
    value: '24 mins/step',
    delta: '+12% faster',
    tone: 'success',
    description: 'Lead time improved thanks to smarter retries.',
    icon: '⚡',
  },
  {
    id: 'capacity',
    label: 'Capacity',
    value: '74% scheduled',
    delta: '2 agents waiting',
    tone: 'info',
    description: 'Resource buffer is comfortable for today.',
    icon: '🧠',
  },
]

export const filterChips: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'All', label: 'All work', icon: '∑' },
  { key: 'P0', label: 'P0 - Mission', icon: '🔥' },
  { key: 'P1', label: 'P1 - Focus', icon: '🎗️' },
  { key: 'P2', label: 'P2 - Stretch', icon: '⭐' },
  { key: 'P3', label: 'P3 - Nice-to-have', icon: '✦' },
]

const backlogTasks = [
  {
    id: 'backlog-1',
    title: 'Document release messaging',
    description: 'Capture new tone guidelines for cross-team handoff.',
    owner: 'Mina Patel',
    attachments: 2,
    statusLabel: 'Queued',
    statusTone: 'info',
    runtime: 'plan requested',
    priority: 'P2',
    planStatus: 'Plan pending review',
  },
  {
    id: 'backlog-2',
    title: 'Audit persona prompts',
    description: 'Compare outputs from our 4 persona templates.',
    owner: 'Avery Zhou',
    attachments: 0,
    statusLabel: 'Draft',
    statusTone: 'neutral',
    runtime: 'awaiting plan',
    priority: 'P1',
    planStatus: 'Needs plan prep',
  },
  {
    id: 'backlog-3',
    title: 'Design doc for streaming',
    description: 'Outline monitoring expectations for live streaming jobs.',
    owner: 'Samir Kaur',
    attachments: 1,
    statusLabel: 'Planning',
    statusTone: 'running',
    runtime: 'plan in-flight',
    priority: 'P3',
    planStatus: 'Scheduled',
  },
]

const todayFocus: FocusLane = {
  title: 'Focus lane',
  description: 'P0 blockers that need eyes before the release window.',
  entries: [
    {
      title: 'Finalize analytics readiness plan',
      owner: 'Lena Ortega',
      due: 'Due 08:30',
    },
  ],
}

const todayTasks = [
  {
    id: 'today-1',
    title: 'Stabilize payment triggers',
    description: 'Confirm retries and alerts are wired before launch.',
    owner: 'Noah Flynn',
    attachments: 3,
    statusLabel: 'Running',
    statusTone: 'running',
    runtime: 'elapsed 02:16',
    priority: 'P0',
    planStatus: 'Plan approved',
  },
  {
    id: 'today-2',
    title: 'Review compliance notes',
    description: 'Surface regulatory notes for the upcoming audit.',
    owner: 'Priya Nanda',
    attachments: 1,
    statusLabel: 'Error',
    statusTone: 'error',
    runtime: 'checkpoint failed',
    priority: 'P1',
    planStatus: 'Retry scheduled',
  },
  {
    id: 'today-3',
    title: 'Update support playbook',
    description: 'Add new recovery flows for payment failures.',
    owner: 'Dylan Torres',
    attachments: 4,
    statusLabel: 'Success',
    statusTone: 'success',
    runtime: 'completed 10 mins ago',
    priority: 'P2',
    planStatus: 'Results ready',
  },
]

const tomorrowTasks = [
  {
    id: 'tomorrow-1',
    title: 'Prep launch retrospective',
    description: 'Draft agenda for post-launch analysis.',
    owner: 'Camila Soto',
    attachments: 1,
    statusLabel: 'Queued',
    statusTone: 'info',
    runtime: 'awaiting plan',
    priority: 'P3',
    planStatus: 'Needs plan',
  },
  {
    id: 'tomorrow-2',
    title: 'Plan monitoring dashboard refresh',
    description: 'Sketch visuals for the new telemetry page.',
    owner: 'Eli Chambers',
    attachments: 2,
    statusLabel: 'Draft',
    statusTone: 'neutral',
    runtime: 'scoping',
    priority: 'P2',
    planStatus: 'Plan requested',
  },
]

export const kanbanColumns: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    subtitle: 'Ideas queued for the coming sprint',
    count: backlogTasks.length,
    tasks: backlogTasks,
  },
  {
    id: 'today',
    title: 'Today',
    subtitle: 'Critical work happening right now',
    count: todayTasks.length,
    tasks: todayTasks,
    focusLane: todayFocus,
  },
  {
    id: 'tomorrow',
    title: 'Tomorrow',
    subtitle: 'Workset for the next sprint day',
    count: tomorrowTasks.length,
    tasks: tomorrowTasks,
  },
]

export const activeAgents: AgentCard[] = [
  {
    id: 'agent-1',
    name: 'Atlas Concierge',
    model: 'Gemini 3.1',
    stage: 'Synthesizing plan',
    timer: '02:16:42',
    health: 'Healthy',
    tone: 'success',
    statusLabel: 'Running',
  },
  {
    id: 'agent-2',
    name: 'Budget Guardian',
    model: 'Claude Sonnet 4.5',
    stage: 'Awaiting plan approval',
    timer: '00:08:19',
    health: 'Cold start',
    tone: 'warning',
    statusLabel: 'Pending',
  },
]

export const pastSessions: SessionRecord[] = [
  {
    id: 'session-1',
    name: 'Commerce release prep',
    status: 'Success',
    statusTone: 'success',
    duration: '26m',
    cost: '$4.82',
    tokens: '12.1k',
  },
  {
    id: 'session-2',
    name: 'Compliance rerun',
    status: 'Error',
    statusTone: 'error',
    duration: '11m',
    cost: '$2.31',
    tokens: '4.8k',
  },
  {
    id: 'session-3',
    name: 'Docs sync audit',
    status: 'Success',
    statusTone: 'success',
    duration: '18m',
    cost: '$3.21',
    tokens: '8.5k',
  },
]

export const reports: ReportItem[] = [
  {
    id: 'report-1',
    title: 'Payment resilience report',
    statusTone: 'error',
    summary: 'Retry spikes detected, cause: 502s from gateway.',
    stats: [
      { label: 'Min cost', value: '$0.92' },
      { label: 'Max cost', value: '$1.30' },
      { label: 'Steps', value: '4' },
    ],
  },
  {
    id: 'report-2',
    title: 'Observability warm-up',
    statusTone: 'warning',
    summary: 'Telemetry backlog 18% higher than baseline.',
    stats: [
      { label: 'Min cost', value: '$0.45' },
      { label: 'Max cost', value: '$0.78' },
      { label: 'Steps', value: '7' },
    ],
  },
]

export const monitoringStack: MonitoringCard[] = [
  {
    id: 'monitoring-1',
    title: 'Live agents',
    metric: '7 healthy • 2 paused',
    delta: '+1 compared to last sync',
    tone: 'success',
  },
  {
    id: 'monitoring-2',
    title: 'Queued alerts',
    metric: '4 pending',
    delta: '1 overdue',
    tone: 'warning',
  },
]

export const archiveItems: ArchiveItem[] = [
  {
    id: 'archive-1',
    title: 'Deprecated reporting flow',
    owner: 'Finance Crew',
    priority: 'P3',
    archivedOn: '2026-02-01',
    extra: 'Restore when analytics signals are ready.',
  },
  {
    id: 'archive-2',
    title: 'Old compliance checklist',
    owner: 'QA Ops',
    priority: 'P2',
    archivedOn: '2026-01-28',
    extra: 'Superseded by new QA runbook.',
  },
]

export const toastFeed: ToastMessage[] = [
  {
    id: 'toast-1',
    variant: 'success',
    title: 'Agent terminated',
    description: 'Budget Guardian shut down cleanly in 4s.',
  },
  {
    id: 'toast-2',
    variant: 'error',
    title: 'Report failure',
    description: 'Payment resilience report archived for follow-up.',
  },
]
