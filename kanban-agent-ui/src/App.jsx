import React from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useUIStore } from './store/uiStore'
import Header from './components/Header/Header'
import ActiveSessions from './components/Sessions/ActiveSessions'
import PastSessions from './components/Sessions/PastSessions'
import FilterBar from './components/Header/FilterBar'
import KanbanBoard from './components/KanbanBoard/KanbanBoard'
import ReportsBar from './components/RightPanel/ReportsBar'
import ArchivePanel from './components/RightPanel/ArchivePanel'
import EventStream from './components/RightPanel/EventStream'
import TaskModal from './components/Modals/TaskModal'
import PlanReviewModal from './components/Modals/PlanReviewModal'
import SessionViewModal from './components/Modals/SessionViewModal'
import ReportModal from './components/Modals/ReportModal'
import TaskDetailModal from './components/Modals/TaskDetailModal'
import ExecutionProgress from './components/RightPanel/ExecutionProgress'
import AgentManagerPage from './components/AgentManager/AgentManagerPage'
import AgentCreator from './components/AgentManager/AgentCreator'
import './App.css'

function App() {
  useWebSocket()
  const activeView = useUIStore((state) => state.activeView)

  return (
    <div className="app">
      <Header />

      {activeView === 'agents' ? (
        <AgentManagerPage />
      ) : (
        <>
          <div className="active-agents-bar">
            <ActiveSessions />
            <PastSessions />
          </div>
          <FilterBar />
          <KanbanBoard />
          <ReportsBar />
          <EventStream />
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
