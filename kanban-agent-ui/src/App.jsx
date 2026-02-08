import React, { useMemo } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useUIStore } from './store/uiStore'
import GlobalHeader from './components/dashboard/GlobalHeader'
import MetricStrip from './components/dashboard/MetricStrip'
import FilterRow from './components/dashboard/FilterRow'
import RightRail from './components/dashboard/RightRail'
import KanbanBoard from './components/KanbanBoard/KanbanBoard'
import ArchivePanel from './components/RightPanel/ArchivePanel'
import ReportsPage from './components/Reports/ReportsPage'
import QuickActions from './components/dashboard/QuickActions'
import TaskModal from './components/Modals/TaskModal'
import PlanReviewModal from './components/Modals/PlanReviewModal'
import SessionViewModal from './components/Modals/SessionViewModal'
import ReportModal from './components/Modals/ReportModal'
import TaskDetailModal from './components/Modals/TaskDetailModal'
import ExecutionProgress from './components/RightPanel/ExecutionProgress'
import AgentManagerPage from './components/AgentManager/AgentManagerPage'
import AgentCreator from './components/AgentManager/AgentCreator'
import SessionsPage from './components/Sessions/SessionsPage'
import UsagePage from './components/Usage/UsagePage'
import { useTasks } from './hooks/useTasks'
import { useActiveSessions } from './hooks/useSessions'
import { useReports } from './hooks/useReports'
import { useUsageSummary } from './hooks/useUsage'
import './App.css'

function App() {
  useWebSocket()
  const activeView = useUIStore((state) => state.activeView)

  // Compute live metrics from real data
  const { data: tasksData } = useTasks()
  const { data: sessionsData } = useActiveSessions()
  const { data: reportsData } = useReports()
  const { data: usageData } = useUsageSummary()

  const metrics = useMemo(() => {
    const tasks = tasksData?.tasks || []
    const activeSessions = sessionsData?.sessions || []
    const reports = reportsData?.reports || []
    const usage = usageData?.totals || {}

    const stalledApprovals = tasks.filter((t) => t.executionStatus === 'plan-pending').length
    const totalCost = usage.cost || 0
    const totalTokens = usage.tokens || 0
    const totalSessions = usage.sessions || 0

    // Format token count for display
    const formatTokens = (n) => {
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
      if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
      return String(n)
    }

    return [
      {
        id: 'total-spend',
        icon: '\u{1F4B0}',
        label: 'Total Spend',
        value: '$' + totalCost.toFixed(2),
        delta: totalSessions + ' session' + (totalSessions !== 1 ? 's' : ''),
        description: totalSessions === 0 ? 'No sessions yet' : 'Across all agents',
        tone: totalCost > 10 ? 'warning' : 'success',
      },
      {
        id: 'active-exec',
        icon: '\u26A1',
        label: 'Active Executions',
        value: String(activeSessions.length).padStart(2, '0'),
        delta: activeSessions.length > 0 ? 'Running now' : 'Idle',
        description: activeSessions.length + ' agent' + (activeSessions.length !== 1 ? 's' : '') + ' working',
        tone: activeSessions.length > 0 ? 'info' : 'success',
      },
      {
        id: 'stalled',
        icon: '\u23F3',
        label: 'Stalled Approvals',
        value: String(stalledApprovals).padStart(2, '0'),
        delta: stalledApprovals > 0 ? 'Awaiting review' : 'All clear',
        description: 'Plan reviews pending',
        tone: stalledApprovals > 2 ? 'danger' : stalledApprovals > 0 ? 'warning' : 'success',
      },
      {
        id: 'token-usage',
        icon: '\u{1F9E0}',
        label: 'Token Usage',
        value: formatTokens(totalTokens),
        delta: reports.length + ' report' + (reports.length !== 1 ? 's' : ''),
        description: 'Total tokens consumed',
        tone: totalTokens > 1_000_000 ? 'warning' : 'info',
      },
    ]
  }, [tasksData, sessionsData, reportsData, usageData])

  return (
    <div className="app">
      <GlobalHeader />

      {activeView === 'agents' ? (
        <AgentManagerPage />
      ) : activeView === 'sessions' ? (
        <SessionsPage />
      ) : activeView === 'usage' ? (
        <UsagePage />
      ) : activeView === 'reports' ? (
        <ReportsPage />
      ) : (
        <>
          <MetricStrip metrics={metrics} />
          <FilterRow />
          <QuickActions />
          <div className="dashboard-grid">
            <div className="dashboard-main">
              <KanbanBoard />
            </div>
            <RightRail />
          </div>
          <ArchivePanel />
          <ExecutionProgress />
        </>
      )}

      <TaskModal />
      <TaskDetailModal />
      <PlanReviewModal />
      <SessionViewModal />
      <ReportModal />
      <AgentCreator />
    </div>
  )
}

export default App
