Kanban Agent Execution Framework - React Migration Plan

**Project:** Frontend Architecture Migration
**Goal:** Migrate from vanilla HTML/CSS/JS to React + React Query
**Timeline:** 2-3 days (with AI assistance)
**Current State:** Express backend stable, frontend unstable with sync issues
**Target State:** Real-time reactive UI with automatic state synchronization

-----

## Executive Summary

This migration rebuilds the frontend UI layer while preserving the existing Express backend completely unchanged. The core issue being solved is unreliable state synchronization between the server, WebSocket broadcasts, and DOM updates. React + React Query provides declarative state management where UI automatically reflects server state without manual refresh logic.

**Key Principle:** Backend stays identical. All Express endpoints, agent spawning, file storage, and WebSocket broadcasting remain exactly as implemented. Only the client-side rendering and state management changes.

-----

## Phase 1: Foundation Setup (2-4 hours)

### 1.1 Create React Application

```bash
npm create vite@latest kanban-agent-ui -- --template react
cd kanban-agent-ui
npm install
```

**Rationale:** Vite over Create React App for faster dev server and modern defaults. React over Vue/Svelte because ecosystem maturity for complex state management.

### 1.2 Install Core Dependencies

```bash
npm install @tanstack/react-query axios
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install react-router-dom
npm install date-fns
npm install zustand # lightweight state management for UI-only state
```

**Dependency Rationale:**

- `@tanstack/react-query` - Server state management, caching, automatic refetching
- `axios` - HTTP client with interceptors and better error handling than fetch
- `@dnd-kit/core` + `@dnd-kit/sortable` - Modern drag-and-drop with proper React integration
- `react-router-dom` - Future-proofing for multi-page views (analytics dashboard, settings)
- `date-fns` - Lightweight date formatting (used in existing UI)
- `zustand` - Simple state for UI concerns (modal open/closed, selected task, etc.)

### 1.3 Development Environment Configuration

**`vite.config.js`:**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
plugins: [react()],
server: {
port: 3000,
proxy: {
'/api': {
target: 'http://localhost:3001',
changeOrigin: true,
},
'/ws': {
target: 'ws://localhost:3001',
ws: true,
}
}
}
})
```

**Rationale:** React dev server runs on port 3000, proxies API calls to existing Express server on 3001. This allows calling `/api/v1/tasks` from React code while Express continues running unchanged.

### 1.4 Project Structure

```
kanban-agent-ui/
├── src/
│ ├── components/
│ │ ├── KanbanBoard/
│ │ │ ├── KanbanBoard.jsx
│ │ │ ├── KanbanColumn.jsx
│ │ │ ├── TaskCard.jsx
│ │ │ └── TaskCard.module.css
│ │ ├── Modals/
│ │ │ ├── TaskModal.jsx
│ │ │ ├── PlanReviewModal.jsx
│ │ │ ├── ReportModal.jsx
│ │ │ └── SessionViewModal.jsx
│ │ ├── Sessions/
│ │ │ ├── ActiveSessions.jsx
│ │ │ ├── SessionCard.jsx
│ │ │ └── SessionProgress.jsx
│ │ ├── RightPanel/
│ │ │ ├── RightPanel.jsx
│ │ │ ├── PastSessions.jsx
│ │ │ ├── ReportsList.jsx
│ │ │ └── Archive.jsx
│ │ └── Header/
│ │ ├── Header.jsx
│ │ └── SearchBar.jsx
│ ├── hooks/
│ │ ├── useTasks.js
│ │ ├── useSessions.js
│ │ ├── useReports.js
│ │ ├── useWebSocket.js
│ │ └── usePlans.js
│ ├── api/
│ │ ├── client.js
│ │ ├── tasks.js
│ │ ├── plans.js
│ │ ├── sessions.js
│ │ └── reports.js
│ ├── store/
│ │ └── uiStore.js # Zustand store for modal state, etc.
│ ├── utils/
│ │ ├── websocket.js
│ │ ├── formatters.js
│ │ └── constants.js
│ ├── App.jsx
│ ├── App.css
│ └── main.jsx
├── public/
├── index.html
├── package.json
└── vite.config.js
```

**Architecture Notes:**

- Components are organized by feature domain (Board, Modals, Sessions)
- Hooks encapsulate all data fetching logic with React Query
- API layer provides clean interface to Express backend
- Store handles UI-only state (modal visibility, selected items)
- Utils provide shared utilities that don’t fit elsewhere

-----

## Phase 2: Core Infrastructure (3-5 hours)

### 2.1 API Client Setup

**`src/api/client.js`:**

```javascript
import axios from 'axios';

const client = axios.create({
baseURL: '/api/v1', // Proxied to localhost:3001 by Vite
timeout: 30000,
headers: {
'Content-Type': 'application/json',
}
});

// Request interceptor for logging
client.interceptors.request.use(
(config) => {
console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
return config;
},
(error) => Promise.reject(error)
);

// Response interceptor for error handling
client.interceptors.response.use(
(response) => response,
(error) => {
console.error('[API Error]', error.response?.data || error.message);
return Promise.reject(error);
}
);

export default client;
```

**`src/api/tasks.js`:**

```javascript
import client from './client';

export const tasksApi = {
getAll: () => client.get('/tasks').then(res => res.data),

create: (taskData) => client.post('/tasks', taskData).then(res => res.data),

update: (id, updates) => client.put(`/tasks/${id}`, updates).then(res => res.data),

delete: (id) => client.delete(`/tasks/${id}`).then(res => res.data),

move: (id, column) => client.post(`/tasks/${id}/move`, { column }).then(res => res.data),
};
```

**Similar files needed:** `plans.js`, `sessions.js`, `reports.js` following same pattern.

**Rationale:** Centralized API client with interceptors means all HTTP requests get consistent logging and error handling. Individual API modules provide type-safe interfaces that match Express endpoints exactly.

### 2.2 React Query Setup

**`src/main.jsx`:**

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
defaultOptions: {
queries: {
staleTime: 1000, // Consider data stale after 1 second
refetchOnWindowFocus: true,
refetchOnReconnect: true,
retry: 3,
},
},
})

ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
<QueryClientProvider client={queryClient}>
<App />
<ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
</React.StrictMode>,
)
```

**Rationale:** Short staleTime means UI stays fresh without manual refresh. Aggressive refetch policies ensure UI recovers from network issues. ReactQueryDevtools provides visibility into cache state during development.

### 2.3 WebSocket Integration

**`src/hooks/useWebSocket.js`:**

```javascript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useWebSocket() {
const queryClient = useQueryClient();
const wsRef = useRef(null);

useEffect(() => {
// Connect to existing Express WebSocket server
const ws = new WebSocket('ws://localhost:3001');
wsRef.current = ws;

ws.onopen = () => {
console.log('[WebSocket] Connected');
};

ws.onmessage = (event) => {
try {
const message = JSON.parse(event.data);
console.log('[WebSocket] Message:', message);

// Invalidate relevant queries based on message type
switch (message.type) {
case 'task-updated':
case 'task-created':
case 'task-deleted':
case 'task-moved':
queryClient.invalidateQueries({ queryKey: ['tasks'] });
break;

case 'session-started':
case 'session-progress':
case 'session-completed':
case 'session-failed':
queryClient.invalidateQueries({ queryKey: ['sessions'] });
queryClient.invalidateQueries({ queryKey: ['tasks'] });
break;

case 'plan-created':
case 'plan-approved':
queryClient.invalidateQueries({ queryKey: ['plans', message.taskId] });
queryClient.invalidateQueries({ queryKey: ['tasks'] });
break;

case 'report-generated':
queryClient.invalidateQueries({ queryKey: ['reports'] });
break;

default:
console.warn('[WebSocket] Unknown message type:', message.type);
}
} catch (error) {
console.error('[WebSocket] Parse error:', error);
}
};

ws.onerror = (error) => {
console.error('[WebSocket] Error:', error);
};

ws.onclose = () => {
console.log('[WebSocket] Disconnected');
// Optional: implement reconnection logic
setTimeout(() => {
console.log('[WebSocket] Attempting reconnection...');
// Trigger re-mount to reconnect
}, 5000);
};

return () => {
if (wsRef.current) {
wsRef.current.close();
}
};
}, [queryClient]);

return wsRef.current;
}
```

**Critical Implementation Note:** Your Express server already broadcasts WebSocket messages. This hook just needs to listen and tell React Query which caches to invalidate. React Query then automatically refetches the data, and React automatically updates the UI. No manual DOM manipulation needed.

### 2.4 Data Fetching Hooks

**`src/hooks/useTasks.js`:**

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';

export function useTasks() {
return useQuery({
queryKey: ['tasks'],
queryFn: tasksApi.getAll,
});
}

export function useCreateTask() {
const queryClient = useQueryClient();

return useMutation({
mutationFn: tasksApi.create,
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['tasks'] });
},
});
}

export function useUpdateTask() {
const queryClient = useQueryClient();

return useMutation({
mutationFn: ({ id, updates }) => tasksApi.update(id, updates),
onMutate: async ({ id, updates }) => {
// Optimistic update
await queryClient.cancelQueries({ queryKey: ['tasks'] });
const previousTasks = queryClient.getQueryData(['tasks']);

queryClient.setQueryData(['tasks'], (old) =>
old.map(task => task.id === id ? { ...task, ...updates } : task)
);

return { previousTasks };
},
onError: (err, variables, context) => {
// Rollback on error
queryClient.setQueryData(['tasks'], context.previousTasks);
},
onSettled: () => {
queryClient.invalidateQueries({ queryKey: ['tasks'] });
},
});
}

export function useMoveTask() {
const queryClient = useQueryClient();

return useMutation({
mutationFn: ({ id, column }) => tasksApi.move(id, column),
onMutate: async ({ id, column }) => {
// Optimistic update for instant drag-and-drop feedback
await queryClient.cancelQueries({ queryKey: ['tasks'] });
const previousTasks = queryClient.getQueryData(['tasks']);

queryClient.setQueryData(['tasks'], (old) =>
old.map(task => task.id === id ? { ...task, column } : task)
);

return { previousTasks };
},
onError: (err, variables, context) => {
queryClient.setQueryData(['tasks'], context.previousTasks);
},
onSettled: () => {
queryClient.invalidateQueries({ queryKey: ['tasks'] });
},
});
}
```

**Key Pattern:** Mutations include optimistic updates for instant UI feedback, with automatic rollback on failure. The WebSocket connection provides the authoritative update from the server, ensuring eventual consistency.

**Similar hooks needed:** `useSessions.js`, `usePlans.js`, `useReports.js` following this same pattern.

-----

## Phase 3: UI Components Implementation (6-10 hours)

### 3.1 Main Application Shell

**`src/App.jsx`:**

```javascript
import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Header from './components/Header/Header';
import KanbanBoard from './components/KanbanBoard/KanbanBoard';
import ActiveSessions from './components/Sessions/ActiveSessions';
import RightPanel from './components/RightPanel/RightPanel';
import './App.css';

function App() {
// Initialize WebSocket connection
useWebSocket();

return (
<div className="app">
<Header />
<ActiveSessions />
<div className="main-content">
<KanbanBoard />
<RightPanel />
</div>
</div>
);
}

export default App;
```

**Rationale:** Top-level App component establishes WebSocket connection once and maintains it throughout app lifecycle. Child components use React Query hooks to fetch data - they don’t need to know about WebSocket implementation.

### 3.2 Kanban Board Component

**`src/components/KanbanBoard/KanbanBoard.jsx`:**

```javascript
import React from 'react';
import {
DndContext,
DragOverlay,
closestCorners,
KeyboardSensor,
PointerSensor,
useSensor,
useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import { useTasks, useMoveTask } from '../../hooks/useTasks';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import './KanbanBoard.css';

const COLUMNS = ['today', 'tonight', 'backlog', 'done'];

function KanbanBoard() {
const { data: tasks = [], isLoading, error } = useTasks();
const moveTask = useMoveTask();
const [activeId, setActiveId] = React.useState(null);

const sensors = useSensors(
useSensor(PointerSensor),
useSensor(KeyboardSensor)
);

// Group tasks by column
const tasksByColumn = React.useMemo(() => {
return COLUMNS.reduce((acc, column) => {
acc[column] = tasks.filter(task => task.column === column);
return acc;
}, {});
}, [tasks]);

const handleDragStart = (event) => {
setActiveId(event.active.id);
};

const handleDragEnd = (event) => {
const { active, over } = event;

if (!over) {
setActiveId(null);
return;
}

const activeTask = tasks.find(t => t.id === active.id);
const overColumn = over.data.current?.column || over.id;

if (activeTask.column !== overColumn) {
// Optimistic update happens in useMoveTask hook
moveTask.mutate({ id: active.id, column: overColumn });
}

setActiveId(null);
};

if (isLoading) {
return <div className="kanban-loading">Loading tasks...</div>;
}

if (error) {
return <div className="kanban-error">Error loading tasks: {error.message}</div>;
}

return (
<DndContext
sensors={sensors}
collisionDetection={closestCorners}
onDragStart={handleDragStart}
onDragEnd={handleDragEnd}
>
<div className="kanban-board">
{COLUMNS.map(column => (
<KanbanColumn
key={column}
id={column}
title={column.charAt(0).toUpperCase() + column.slice(1)}
tasks={tasksByColumn[column]}
/>
))}
</div>
<DragOverlay>
{activeId ? (
<TaskCard task={tasks.find(t => t.id === activeId)} isDragging />
) : null}
</DragOverlay>
</DndContext>
);
}

export default KanbanBoard;
```

**`src/components/KanbanBoard/KanbanColumn.jsx`:**

```javascript
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

function KanbanColumn({ id, title, tasks }) {
const { setNodeRef } = useDroppable({
id,
data: { column: id }
});

return (
<div className="kanban-column">
<div className="column-header">
<h2>{title}</h2>
<span className="task-count">{tasks.length}</span>
</div>
<div ref={setNodeRef} className="column-content">
<SortableContext
items={tasks.map(t => t.id)}
strategy={verticalListSortingStrategy}
>
{tasks.map(task => (
<TaskCard key={task.id} task={task} />
))}
</SortableContext>
</div>
</div>
);
}

export default KanbanColumn;
```

**`src/components/KanbanBoard/TaskCard.jsx`:**

```javascript
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUIStore } from '../../store/uiStore';
import './TaskCard.css';

function TaskCard({ task, isDragging = false }) {
const {
attributes,
listeners,
setNodeRef,
transform,
transition,
} = useSortable({ id: task.id });

const openTaskModal = useUIStore(state => state.openTaskModal);

const style = {
transform: CSS.Transform.toString(transform),
transition,
opacity: isDragging ? 0.5 : 1,
};

const getStatusEmoji = () => {
switch (task.status) {
case 'planning': return '🧠';
case 'awaiting-approval': return '⏳';
case 'executing': return '⚡';
case 'completed': return '✅';
case 'failed': return '❌';
default: return '📝';
}
};

return (
<div
ref={setNodeRef}
style={style}
className={`task-card ${task.status}`}
{...attributes}
{...listeners}
onClick={() => openTaskModal(task)}
>
<div className="task-header">
<span className="task-emoji">{getStatusEmoji()}</span>
<span className="task-title">{task.title}</span>
</div>

{task.description && (
<p className="task-description">{task.description}</p>
)}

<div className="task-footer">
{task.agentType && (
<span className="agent-type">{task.agentType}</span>
)}
{task.estimatedCost && (
<span className="estimated-cost">${task.estimatedCost.toFixed(3)}</span>
)}
</div>

{task.status === 'executing' && task.currentStep && (
<div className="progress-indicator">
Step {task.currentStep} of {task.totalSteps}
</div>
)}
</div>
);
}

export default TaskCard;
```

**Key Implementation Details:**

- `useSortable` provides all drag-and-drop functionality
- Optimistic updates happen automatically via `useMoveTask` hook
- Task status changes (planning → executing → completed) automatically trigger re-renders when WebSocket invalidates cache
- No manual refresh needed - React Query + WebSocket handle everything

### 3.3 Active Sessions Component

**`src/components/Sessions/ActiveSessions.jsx`:**

```javascript
import React from 'react';
import { useSessions } from '../../hooks/useSessions';
import SessionCard from './SessionCard';
import './ActiveSessions.css';

function ActiveSessions() {
const { data: sessions = [], isLoading } = useSessions('active');

if (isLoading || sessions.length === 0) {
return null; // Don't show empty state
}

return (
<div className="active-sessions">
<h3>Active Sessions ({sessions.length})</h3>
<div className="sessions-scroll">
{sessions.map(session => (
<SessionCard key={session.id} session={session} />
))}
</div>
</div>
);
}

export default ActiveSessions;
```

**`src/components/Sessions/SessionCard.jsx`:**

```javascript
import React from 'react';
import { useUIStore } from '../../store/uiStore';
import SessionProgress from './SessionProgress';
import './SessionCard.css';

function SessionCard({ session }) {
const openSessionModal = useUIStore(state => state.openSessionModal);

return (
<div
className="session-card"
onClick={() => openSessionModal(session.id)}
>
<div className="session-header">
<span className="session-title">{session.taskTitle}</span>
<span className="session-agent">{session.agentType}</span>
</div>

<SessionProgress
currentStep={session.currentStep}
totalSteps={session.totalSteps}
status={session.status}
/>

<div className="session-footer">
<span className="session-time">
{formatDuration(Date.now() - new Date(session.startedAt))}
</span>
<span className="session-cost">
${session.costAccrued.toFixed(4)}
</span>
</div>
</div>
);
}

function formatDuration(ms) {
const seconds = Math.floor(ms / 1000);
const minutes = Math.floor(seconds / 60);
const hours = Math.floor(minutes / 60);

if (hours > 0) return `${hours}h ${minutes % 60}m`;
if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
return `${seconds}s`;
}

export default SessionCard;
```

**Critical Feature:** Session progress updates automatically as WebSocket messages come in. The user sees real-time progress without any manual action. This completely solves your “I don’t know if something is running” problem.

### 3.4 Modals Implementation

**`src/store/uiStore.js`:**

```javascript
import { create } from 'zustand';

export const useUIStore = create((set) => ({
// Task modal
taskModalOpen: false,
taskModalData: null,
openTaskModal: (task = null) => set({ taskModalOpen: true, taskModalData: task }),
closeTaskModal: () => set({ taskModalOpen: false, taskModalData: null }),

// Plan review modal
planModalOpen: false,
planModalData: null,
openPlanModal: (plan) => set({ planModalOpen: true, planModalData: plan }),
closePlanModal: () => set({ planModalOpen: false, planModalData: null }),

// Session view modal
sessionModalOpen: false,
sessionModalId: null,
openSessionModal: (sessionId) => set({ sessionModalOpen: true, sessionModalId }),
closeSessionModal: () => set({ sessionModalOpen: false, sessionModalId: null }),

// Report modal
reportModalOpen: false,
reportModalData: null,
openReportModal: (report) => set({ reportModalOpen: true, reportModalData: report }),
closeReportModal: () => set({ reportModalOpen: false, reportModalData: null }),

// Right panel
rightPanelOpen: true,
toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}));
```

**`src/components/Modals/TaskModal.jsx`:**

```javascript
import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import './TaskModal.css';

function TaskModal() {
const { taskModalOpen, taskModalData, closeTaskModal } = useUIStore();
const createTask = useCreateTask();
const updateTask = useUpdateTask();

const [formData, setFormData] = React.useState({
title: '',
description: '',
agentType: 'auto',
column: 'backlog',
});

React.useEffect(() => {
if (taskModalData) {
setFormData(taskModalData);
} else {
setFormData({
title: '',
description: '',
agentType: 'auto',
column: 'backlog',
});
}
}, [taskModalData]);

const handleSubmit = async (e) => {
e.preventDefault();

try {
if (taskModalData?.id) {
await updateTask.mutateAsync({ id: taskModalData.id, updates: formData });
} else {
await createTask.mutateAsync(formData);
}
closeTaskModal();
} catch (error) {
console.error('Failed to save task:', error);
// Show error toast/notification
}
};

if (!taskModalOpen) return null;

return (
<div className="modal-overlay" onClick={closeTaskModal}>
<div className="modal-content" onClick={e => e.stopPropagation()}>
<div className="modal-header">
<h2>{taskModalData ? 'Edit Task' : 'Create Task'}</h2>
<button className="modal-close" onClick={closeTaskModal}>×</button>
</div>

<form onSubmit={handleSubmit}>
<div className="form-group">
<label htmlFor="title">Title *</label>
<input
id="title"
type="text"
value={formData.title}
onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
required
placeholder="What needs to be done?"
/>
</div>

<div className="form-group">
<label htmlFor="description">Description</label>
<textarea
id="description"
value={formData.description}
onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
rows={4}
placeholder="Additional details or context..."
/>
</div>

<div className="form-group">
<label htmlFor="agentType">Agent Type</label>
<select
id="agentType"
value={formData.agentType}
onChange={e => setFormData(prev => ({ ...prev, agentType: e.target.value }))}
>
<option value="auto">Auto (Kimi K2.5)</option>
<option value="coder">Coder (GPT-5.2 Codex)</option>
<option value="ui-designer">UI Designer (Claude Sonnet 4.5)</option>
<option value="researcher">Researcher (Kimi K2.5)</option>
<option value="writer">Writer (Claude Sonnet 4.5)</option>
<option value="planner">Planner (Claude Opus 4.5)</option>
</select>
</div>

<div className="form-group">
<label htmlFor="column">Starting Column</label>
<select
id="column"
value={formData.column}
onChange={e => setFormData(prev => ({ ...prev, column: e.target.value }))}
>
<option value="today">Today</option>
<option value="tonight">Tonight</option>
<option value="backlog">Backlog</option>
</select>
</div>

<div className="modal-actions">
<button type="button" onClick={closeTaskModal}>Cancel</button>
<button type="submit" disabled={createTask.isPending || updateTask.isPending}>
{createTask.isPending || updateTask.isPending ? 'Saving...' : 'Save Task'}
</button>
</div>
</form>
</div>
</div>
);
}

export default TaskModal;
```

**Implementation Note:** Similar modal components needed for `PlanReviewModal`, `SessionViewModal`, and `ReportModal`. All follow this same pattern of reading from Zustand for open/closed state and using React Query hooks for data fetching.

-----

## Phase 4: Styling Migration (2-3 hours)

### 4.1 CSS Architecture

Migrate existing CSS from `agent-dashboard.html` to modular CSS files. Use CSS Modules for component-specific styles to avoid global namespace pollution.

**`src/App.css`:**

```css
:root {
--bg-primary: #0a0e27;
--bg-secondary: #141829;
--bg-tertiary: #1e2139;
--text-primary: #e0e0e0;
--text-secondary: #a0a0a0;
--accent-blue: #4a9eff;
--accent-green: #4caf50;
--accent-yellow: #ffc107;
--accent-red: #f44336;
--border-color: #2a2e45;
}

* {
margin: 0;
padding: 0;
box-sizing: border-box;
}

body {
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
background: var(--bg-primary);
color: var(--text-primary);
line-height: 1.6;
}

.app {
min-height: 100vh;
display: flex;
flex-direction: column;
}

.main-content {
display: flex;
flex: 1;
gap: 1rem;
padding: 1rem;
}

/* Copy remaining global styles from existing agent-dashboard.html */
```

**Strategy:** Extract all CSS from the existing HTML file, organize into component-specific CSS modules, maintain exact visual appearance while gaining better encapsulation.

### 4.2 Component-Specific Styles

Each component gets its own CSS file (e.g., `TaskCard.css`, `KanbanBoard.css`) that imports only the styles it needs. This prevents style conflicts and makes the codebase more maintainable.

-----

## Phase 5: Testing & Validation (2-3 hours)

### 5.1 Functional Testing Checklist

**Task Management:**

- [ ] Create new task via modal
- [ ] Edit existing task
- [ ] Delete task
- [ ] Drag task between columns
- [ ] Task status updates automatically during execution
- [ ] Task moves to “Done” automatically on completion

**Agent Execution:**

- [ ] Trigger planning phase
- [ ] View plan in modal
- [ ] Approve plan
- [ ] Reject plan with feedback
- [ ] Watch execution progress in real-time
- [ ] Session card updates without manual refresh
- [ ] Multiple concurrent sessions display correctly

**Real-Time Updates:**

- [ ] WebSocket connects on app load
- [ ] Task updates broadcast to UI automatically
- [ ] Session progress updates in real-time
- [ ] New tasks appear without refresh
- [ ] Completed tasks move to archive automatically

**Data Persistence:**

- [ ] Refresh page - all data persists
- [ ] Close browser tab - data persists
- [ ] Kill Express server - React app shows loading/error states gracefully
- [ ] Restart Express server - React app reconnects automatically

### 5.2 Performance Testing

**Scenarios to verify:**

- Load 50+ tasks - board remains responsive
- Multiple concurrent agent sessions - UI doesn’t slow down
- Rapid drag-and-drop operations - optimistic updates work smoothly
- High-frequency WebSocket messages - no memory leaks

### 5.3 Error Handling Validation

**Test failure modes:**

- Express server offline when React app loads
- WebSocket disconnects mid-session
- Agent execution fails
- Network request times out
- Malformed data from API

**Expected behaviors:**

- Graceful error messages
- Automatic retry with exponential backoff
- WebSocket reconnection
- Optimistic updates rollback on failure

-----

## Phase 6: Deployment & Cutover (1-2 hours)

### 6.1 Production Build

```bash
cd kanban-agent-ui
npm run build
```

This creates optimized production assets in `dist/` directory.

### 6.2 Serve React Build from Express

**Update Express `server.js`:**

```javascript
const express = require('express');
const path = require('path');

const app = express();

// Serve static React build
app.use(express.static(path.join(__dirname, '../kanban-agent-ui/dist')));

// API routes remain unchanged
app.use('/api/v1', apiRouter);

// Fallback to React for client-side routing
app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, '../kanban-agent-ui/dist/index.html'));
});

// Start server
app.listen(3001, () => {
console.log('Server running on http://localhost:3001');
});
```

**Rationale:** Single port deployment. React app and Express API both served from port 3001. Simplifies production deployment and avoids CORS issues.

### 6.3 Cutover Strategy

**Parallel Operation Phase (recommended):**

1. Keep old `agent-dashboard.html` accessible at `/old-dashboard`
1. Serve new React app as default at `/`
1. Run both for 1-2 days to validate behavior
1. Monitor for any regressions or missing functionality
1. Remove old dashboard once confident

**Hard Cutover (alternative):**

1. Replace `agent-dashboard.html` with React build immediately
1. Keep backup of old HTML file
1. Monitor closely for issues

-----

## Phase 7: Future Enhancements (Post-Migration)

Once core migration is complete and stable, consider these improvements:

### 7.1 Enhanced Real-Time Features

- Toast notifications for task state changes
- Sound alerts when agents complete tasks
- Desktop notifications (Notification API)
- Progress bars with estimated time remaining

### 7.2 Advanced State Management

- Persist UI preferences (collapsed panels, sort order) to localStorage
- Undo/redo for task operations
- Keyboard shortcuts for common actions
- Search and filter tasks by agent type, status, date

### 7.3 Analytics & Insights

- Cost analytics dashboard (daily/weekly spend)
- Agent performance metrics (success rate, avg time)
- Task completion trends over time
- Token usage visualization

### 7.4 Collaboration Features

- Multi-user support with authentication
- Real-time collaboration indicators (who’s viewing what)
- Task comments and discussion threads
- Shared workspaces

### 7.5 Mobile Experience

- Responsive design for tablet/phone
- Progressive Web App (PWA) capabilities
- Offline support with sync when reconnected
- Native app wrapper (Capacitor or React Native)

-----

## Risk Mitigation

### Technical Risks

**Risk:** React Query cache gets out of sync with server state
**Mitigation:** WebSocket messages always trigger cache invalidation. Short staleTime ensures frequent refetches. React Query Devtools help debug cache state.

**Risk:** Drag-and-drop breaks with optimistic updates
**Mitigation:** Optimistic updates include rollback logic. If server rejects move, UI automatically reverts.

**Risk:** WebSocket disconnects without user awareness
**Mitigation:** Connection status indicator in UI. Automatic reconnection with exponential backoff. Fallback to polling if WebSocket unavailable.

**Risk:** Performance degrades with many tasks/sessions
**Mitigation:** Virtualized lists for large datasets (react-window). Pagination for archives. Lazy loading for modal content.

### Development Risks

**Risk:** Migration takes longer than estimated
**Mitigation:** Incremental rollout. Get kanban board working first, then add features progressively.

**Risk:** Unfamiliar with React/React Query
**Mitigation:** AI assistance for code generation. Strong documentation. Similar patterns across all components reduce learning curve.

**Risk:** Breaking existing Express backend
**Mitigation:** Backend remains completely unchanged. Only client-side code changes. Can run old and new UIs simultaneously during transition.

-----

## Success Criteria

The migration is considered successful when:

1. **Zero Manual Refreshes Required** - All UI updates happen automatically via WebSocket + React Query
1. **Instant Visual Feedback** - Drag-and-drop and button clicks update UI immediately (optimistic updates)
1. **Real-Time Session Visibility** - User can see exactly what agents are doing at all times without polling
1. **Stable Under Load** - Multiple concurrent sessions don’t cause UI slowdown or sync issues
1. **Error Recovery** - Network issues, server restarts, and agent failures are handled gracefully
1. **Feature Parity** - All functionality from old HTML dashboard works in React version
1. **Developer Confidence** - Codebase is maintainable, testable, and ready for future enhancements

-----

## Timeline Summary

|Phase |Duration |Deliverable |
|-----------------------|---------------|-----------------------------------------------|
|1. Foundation Setup |2-4 hours |Vite + React + dependencies configured |
|2. Core Infrastructure |3-5 hours |API client, React Query, WebSocket integration |
|3. UI Components |6-10 hours |Kanban board, sessions, modals fully functional|
|4. Styling Migration |2-3 hours |Visual parity with existing dashboard |
|5. Testing & Validation|2-3 hours |All features tested and verified |
|6. Deployment & Cutover|1-2 hours |Production build served from Express |
|**Total** |**16-27 hours**|**Fully functional React application** |

With AI assistance, this can be compressed to 2-3 focused days of development.

-----

## Appendix A: Key Dependencies Version Reference

```json
{
"dependencies": {
"react": "^18.2.0",
"react-dom": "^18.2.0",
"@tanstack/react-query": "^5.17.0",
"@tanstack/react-query-devtools": "^5.17.0",
"axios": "^1.6.5",
"@dnd-kit/core": "^6.1.0",
"@dnd-kit/sortable": "^8.0.0",
"@dnd-kit/utilities": "^3.2.2",
"zustand": "^4.4.7",
"date-fns": "^3.0.6"
},
"devDependencies": {
"@vitejs/plugin-react": "^4.2.1",
"vite": "^5.0.11"
}
}
```

-----

## Appendix B: Express Backend Changes (Minimal)

The only change needed in Express is serving the React build:

```javascript
// Add near the top of server.js
const path = require('path');

// Add after all API routes are defined
if (process.env.NODE_ENV === 'production') {
app.use(express.static(path.join(__dirname, '../kanban-agent-ui/dist')));

app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, '../kanban-agent-ui/dist/index.html'));
});
}
```

Everything else in Express remains identical. All endpoints, WebSocket broadcasting, agent spawning, and file operations continue working exactly as currently implemented.

-----

## Appendix C: Common Pitfalls & Solutions

**Pitfall:** Forgetting to invalidate queries after WebSocket messages
**Solution:** Centralized WebSocket handler that always calls `queryClient.invalidateQueries()`

**Pitfall:** Optimistic updates that don’t rollback on failure
**Solution:** Always implement `onError` with rollback in mutation hooks

**Pitfall:** Re-rendering entire board when one task changes
**Solution:** React.memo on TaskCard, proper key props, granular query invalidation

**Pitfall:** WebSocket connection not closing on unmount
**Solution:** Return cleanup function from useEffect that closes WebSocket

**Pitfall:** Lost scroll position when tasks update
**Solution:** Use stable IDs for tasks, React will preserve DOM elements

-----

## Questions for Clarification

Before starting implementation, confirm:

1. Are there any critical features in current dashboard not documented in the spec?
1. Is there existing test data for load testing, or should that be generated?

-----

**Document Owner:** Senior Engineer implementing migration
**Last Updated:** 2026-02-05
**Status:** Ready for implementation