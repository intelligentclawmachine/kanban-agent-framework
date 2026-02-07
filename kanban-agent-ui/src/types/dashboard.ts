export type ViewMode = 'kanban' | 'agents'
export type FilterKey = 'All' | 'P0' | 'P1' | 'P2' | 'P3'
export type StatusTone = 'running' | 'error' | 'success' | 'info' | 'warning' | 'neutral'

export interface MetricCard {
  id: string
  label: string
  value: string
  delta: string
  tone: StatusTone
  description: string
  icon: string
}

export interface FocusLaneEntry {
  title: string
  owner: string
  due: string
}

export interface FocusLane {
  title: string
  description: string
  entries: FocusLaneEntry[]
}

export interface KanbanTask {
  id: string
  title: string
  description: string
  owner: string
  attachments: number
  statusLabel: string
  statusTone: StatusTone
  runtime: string
  priority: FilterKey
  planStatus: string
  accent?: StatusTone
}

export interface KanbanColumn {
  id: string
  title: string
  subtitle: string
  count: number
  tasks: KanbanTask[]
  focusLane?: FocusLane
}

export interface AgentCard {
  id: string
  name: string
  model: string
  stage: string
  timer: string
  health: string
  tone: StatusTone
  statusLabel: string
}

export interface SessionRecord {
  id: string
  name: string
  status: string
  statusTone: StatusTone
  duration: string
  cost: string
  tokens: string
}

export interface ReportItem {
  id: string
  title: string
  statusTone: StatusTone
  summary: string
  stats: { label: string; value: string }[]
}

export interface MonitoringCard {
  id: string
  title: string
  metric: string
  delta: string
  tone: StatusTone
}

export interface ArchiveItem {
  id: string
  title: string
  owner: string
  priority: FilterKey
  archivedOn: string
  extra: string
}

export interface ToastMessage {
  id: string
  variant: StatusTone
  title: string
  description: string
}
