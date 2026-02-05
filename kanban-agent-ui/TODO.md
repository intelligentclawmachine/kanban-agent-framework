# React Migration - Complete TODO List

## Status: Feature Complete

---

## RECENTLY COMPLETED

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 1 | **Drag-and-drop to empty backlog column** | Done | Fixed with flex layout |
| 2 | **Edit/Delete buttons** | Done | Fixed with onPointerDown stopPropagation |
| 3 | **Side-by-side Agents/Sessions layout** | Done | Active Agents (left 50%), Past Sessions (right 50%) |
| 4 | **Task priority colors/badges** | Done | P0=red, P1=orange, P2=yellow, P3=green |
| 5 | **Session kill button** | Done | Kill button on SessionCard with confirmation |
| 6 | **Plan review/approval flow** | Done | PlanReviewModal with Approve & Regenerate buttons |
| 7 | **Toast notifications** | Done | ToastProvider with success/error/info |
| 8 | **Production build config** | Done | Vite build with code splitting |
| 9 | **API integration (all endpoints)** | Done | Tasks, Plans, Sessions fully wired |

---

## REMAINING ITEMS (Lower Priority)

### Enhancements

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 10 | **Agent type icons** | Not implemented | P3 | Show emoji/icon per agent type on cards |
| 11 | **Responsive design** | Not tested | P3 | Mobile/tablet breakpoints |
| 12 | **Drag-and-drop reorder within column** | Not implemented | P3 | Currently only supports column-to-column |

### Technical Debt

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 13 | **Type checking** | None | P3 | Consider adding PropTypes or TypeScript |
| 14 | **Test coverage** | Zero | P3 | No unit/integration tests |

---

## ARCHITECTURE

### Component Structure
```
src/
  components/
    Header/         - Header, FilterBar
    KanbanBoard/    - KanbanBoard, KanbanColumn, TaskCard
    Modals/         - TaskModal, PlanReviewModal, SessionViewModal, ReportModal, TaskDetailModal
    RightPanel/     - ReportsBar, EventStream, ArchivePanel, ExecutionProgress
    Sessions/       - ActiveSessions, PastSessions, SessionCard, PastSessionCard
    Toast/          - ToastContext (provider + hook)
  hooks/
    useTasks.js     - CRUD operations with React Query
    usePlans.js     - Plan operations (planning, approve, execute)
    useSessions.js  - Active/history sessions, kill
    useWebSocket.js - Real-time updates with auto-reconnect
    useReports.js   - Reports list
    useArchive.js   - Archive operations
    useEvents.js    - Event stream
  api/
    client.js       - Axios instance with interceptors
    tasks.js        - Task endpoints
    plans.js        - Plan endpoints
    sessions.js     - Session endpoints
    reports.js      - Report endpoints
    archive.js      - Archive endpoints
    events.js       - Event endpoints
  store/
    uiStore.js      - Zustand store for modal state, filters
```

### Key Features
- **React Query**: Server state management with caching
- **Zustand**: Client state (modals, filters)
- **@dnd-kit**: Drag-and-drop between columns
- **WebSocket**: Real-time updates with auto-reconnect
- **Toast notifications**: User feedback for actions

---

## RUNNING THE APP

### Development
```bash
cd kanban-agent-ui
npm run dev         # Starts on http://localhost:3000
```

### Production Build
```bash
npm run build       # Creates dist/ folder
# Server automatically serves dist/ when present
```

### Server
```bash
cd ..              # Parent directory
node server.js     # API + WebSocket on http://localhost:3001
```

Access at:
- **React UI**: http://localhost:3000 (dev) or http://localhost:3001 (production)
- **Legacy UI**: http://localhost:3001/legacy

---

## NOTES

- **Stack:** React 18, Vite, React Query, Zustand, @dnd-kit
- **API:** Express server on localhost:3001
- **WebSocket:** ws://localhost:3001

---

*Last updated: 2026-02-05*
