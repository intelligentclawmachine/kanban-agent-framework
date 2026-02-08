# Step 1 — Live Dashboard Capabilities Inventory

## Context & Goals
- Target repo: `~/Desktop/Claw Creations/Kanban Agent UI Complete` (main branch).
- Objective: catalog the ship-ready Kanban dashboard experience that must survive the upcoming redesign.
- Focus areas: routes/components, state management, APIs/sync, auth/data flows, and UI behaviors.

## Commands & Reads (verification)
1. `find src -maxdepth 3 -type f` inside `kanban-agent-ui` to list all frontend modules (kanban board, modals, agent manager, right-hand panels, hooks).
2. `read App.jsx`, `main.jsx`, `store/uiStore.js`, `components/Header/Header.jsx`, `components/KanbanBoard/KanbanBoard.jsx`, `components/Modals/TaskModal.jsx`, `hooks/useTasks.js`, `hooks/useWebSocket.js`, `kanban-agent-ui/package.json` to understand UI flow, state, and data fetching.
3. `read server.js` (header section) plus `README.md` in the root repo to capture API surface, server configuration, and runtime expectations.
4. Confirmed outputs directory structure exists with `ls -la` (executed in sub-agent) and created this report under `~/Desktop/Claw Creations/outputs/create-a-new-production-grade-front-end-for-kanban/`.

## Core Flows & Screens
1. **Kanban View (default):** `Header` controls search/filter/refresh/create task; `ActiveSessions` + `PastSessions` bars show agent activity; `KanbanBoard` renders `STATUS_ORDER` columns (`backlog`, `today`, `tomorrow`, `done`) with drag-and-drop via `@dnd-kit` and optimistic `useMoveTask` updates; filters/priorities/search are driven by `useUIStore`.
2. **Task Lifecycle:** `TaskModal` handles create/update/delete, exposes agent selection (custom or default), context folder/file selection, expected output, plan toggle, `telliEnabled`, and output folders. `PlanReviewModal`, `TaskDetailModal`, `SessionViewModal`, `ReportModal`, `AgentCreator` modals are layered for plans/sessions/reports/agents (all read from `uiStore` flags).
3. **Right Panel:** `ReportsBar`, `EventStream`, `ArchivePanel`, `ExecutionProgress` show data pulled via React Query hooks (`useReports`, `useEvents`, `useArchive`, `useSessions`) so the experience surfaces execution history, plan statuses, archive items, and event logs.
4. **Agent Management:** `AgentManagerPage` + associated components (`AgentCard`, `AgentCreator`, etc.) offer a separate view toggled via `uiStore.activeView` that lists agent profiles, filters, and quick actions.

## Data & State Management
- **React Query**: All asynchronous state runs through `@tanstack/react-query`, with default retry/stale settings defined in `main.jsx`; hooks (`useTasks`, `useSessions`, `useReports`, etc.) encapsulate queries/mutations, include optimistic updates, and invalidate caches on mutations.
- **Zustand `uiStore`**: Controls view toggles (`kanban` vs `agents`), modal visibility/data, filters (`priority`, `search`), archive drawer, agent search/sort filters, and filterable modals.
- **WebSocket Sync**: `useWebSocket` connects to `ws://localhost:3001`, listens for message types (task/session/report events) and invalidates matching query keys (`tasks`, `plans`, `sessions`, `reports`, `archive`, `events`). Maintains auto-reconnect logic.
- **API Layer**: Axios clients (`api/client.js`) talk to `/api/v1/[tasks|plans|sessions|reports|events|files|agents|archive]`. Each hook imports typed API helpers (e.g., `tasksApi.getAll`, `plansApi.fetch`, etc.).

## Backend/Integration Requirements
- Express server (`server.js`) exposes:
  - Kanban task CRUD + move/clear endpoints (`/api/v1/tasks`).
  - Planning workflow (`/plans/:taskId`, `/planning`, `/approve`, `/complete`, `/progress`).
  - Sessions (`/sessions/active`, `/sessions/history`, `/sessions/:id/kill`).
  - Events/reports/archive/files/agents search/sync endpoints plus utilities for Obsidian sync and file uploads.
  - Serves React build via `express.static(REACT_BUILD_DIR)` at `/` and `/legacy` for fallback.
- WebSocket server on `ws://localhost:3001` pushes real-time events (`task-updated`, `session-started`, etc.).
- File-backed data: tasks/events/reports stored under `~/Desktop/Claw Creations`, sync with Obsidian vault via watchers (node-cron/chokidar). Plan storage under `~/.openclaw/workspace/plans` with templates for planning/execution prompts.

## Non-negotiable Functionality to Carry Over
1. **Kanban board with drag/drop** (Today/Tomorrow/Backlog) and reactive filters by priority/search; tasks cannot be mutated outside defined statuses, so selectors must remain stable (`STATUS_ORDER`).
2. **Task creation/editing modal** that toggles plan-first, Telli pick-up, custom agents, context folder/file selection, and output folder management (including dedicated subfolder behavior).
3. **Agent/session/plan surfaces** (active sessions, past sessions, plan review, session view, report modal, agent manager) that display real-time data and open/close via global UI store.
4. **React Query + WebSocket sync** for server state, including invalidation rules for message types (`task-updated`, `session-progress`, etc.) to keep UI accurate without manual refresh; keep `useWebSocket` hook semantics.
5. **Right-hand panels** (reports, event stream, archive, execution progress) connected to dedicated endpoints and reused components.
6. **Server API coverage** for tasks/plans/sessions/reports/events/archive/files/sync endpoints; front-end must continue to rely on the same contracts (URLs, payloads).
7. **Output/reporting integration** (reports and archive entries should remain accessible, modals for detail/plan review, and file pickers referencing `client.post('/utils/pick-folder')`).

## Known Limitations & Workarounds
- All data is local/FS-based; assume `/Desktop/Claw Creations` structure exists and is writable (plan templates under `~/.openclaw/workspace/plans`). When building the new UI, keep file/folder pickers safe for macOS path prompts.
- Authentication is not present—the API is open on localhost, so future redesign should not assume tokens; security boundary is internal only.
- The current app uses `window.confirm` inside modals (e.g., delete task) and synchronous prompts; consider replacing with custom confirmations only if necessary to maintain UX.
- WebSocket events expect specific message types; replicating the `MESSAGE_TO_QUERIES` map is essential to prevent stale views.

## Next Steps for Step 2
- Check out the `new-dashboard-design` branch (per spec) to inventory design changes and UI improvements.
- Identify diffs and merge plan (component-level, CSS, new interactions) so the production-ready build retains all current flows plus the new visual language.
- Prepare to replicate data hooks (React Query/Zustand), modals, and panel layout while aligning with updated styling tokens from the design branch.
