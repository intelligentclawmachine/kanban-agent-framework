# Step 3 – Integration Strategy (Kanban Dashboard)

## 1. Feature mapping (live features → prototype components)

| Existing capability | Prototype component / surface | Integration notes |
| --- | --- | --- |
| Task lifecycle APIs (`GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `/move`) plus drag/plan controls | `KanbanBoard`, column headers, task cards, focus lane, Add task button | Replace static `columns` data with React Query results (`useTasks`). Drive column counts, focus lane (derived from P0 + `inFocus` flag) and `Start`/`View results` controls with `useMoveTask`, `useUpdateTask`, `useCreateTask`. Preserve drag-drop hooks from existing implementation and layer the glow drop overlays from the spec. |
| Focus lane, column badges, metrics, and highlight toggles | Goal spotlight, metric strip, filter row | Compute `goal health`, `stalled approvals`, `throughput` from task metadata (`executionStatus`, `planFirst`, `updated`). Use hook to derive KPI cards and toggle filters (priority chips, today highlight). Persist filter state in `useUIStore` so entire layout respects a single source of truth. |
| Active agents / session management (`/sessions/active`, `/sessions/history`, `/sessions/:id/kill`) | Right rail modules (Active Agents, Past Sessions, Reports) | Wire right rail cards to `useAgents`, `useSessions`, `useReports`. Provide kill/refresh buttons that call `useKillSession`/`useRefresh`. Reflect agent health/status dots, timers, and session cost metadata. |
| Reports + monitoring data (`/reports`, `/events`, WebSocket notifications) | Reports cards, event stream, toast area, execution progress bar | Hook `useReports` for report cards and provide `aria-live` toasts triggered by `useEvents` + `useWebSocket`. Use event counts to update toast stack and execution progress (e.g., steps completed). |
| Archive API (`/archive`, `/tasks/:id/restore`) | Floating Archive FAB + modal overlay | Archive FAB opens modal from `useUIStore`. Load archived items via `useArchive`, render priority pills, and wire Restore/Delete to `restoreTaskFromArchive`/`useDeleteTask`. Keep modal focus trap + accessible labels per spec. |
| View switching, quick actions, search bar, command palette | Header + nav pills + quick action icon buttons | Recreate header from prototype. `view-switcher` toggles between main Kanban board and `AgentManager` (existing component under `components/AgentManager`). Quick action buttons trigger helper overlays (e.g., command palette). Search field filters tasks by title/description via `useTasks` query parameters. |
| Existing modals (task detail, plan, session, report) | Prototype modals & overlays (goal, archive, toasts) | Keep Zustand modal state (`useUIStore`) to drive `components/Modals` and new overlays. Ensure `aria-modal`, focus trap, and `prefers-reduced-motion` logic from spec are wired.

## 2. Architecture adjustments

1. **State & data flow consolidation** – Keep React Query (`@tanstack/react-query`) + `axios` API client but migrate components from mock data to `useTasks`, `useSessions`, `useAgents`, `useReports`, `useArchive`, and `useEvents`. All filter/search criteria should live in `useUIStore` so header/filter row and task board consume a single filter state. Add derived selectors for metrics (goal health, WIP, throughput) and focus lane tasks.
2. **Layout & responsive scaffolding** – Expand `App.tsx` into a layout shell that renders header, metric strip, filter row, Kanban grid, right rail, event stream, and modals inside CSS grid as per grid/breakpoints. Move tokens/spacing from spec into `src/styles`/`index.css` (already defined) and keep `prefers-reduced-motion`. Use `scroll-snap` columns + sticky elements to match prototype.
3. **Routing & view switching** – Rename `view` toggle to drive `useUIStore.activeView`. When `Agent Manager` is active, swap out the board/rail with the existing `AgentManager` components (forms, list). Keep the header/search/metrics shared across views to maintain continuity.
4. **Real-time updates** – Use `useWebSocket` hook to listen to server events (`tasks-refreshed`, `task-moved`, `sessions-updated`, `report-created`, `event`) and invalidate queries or mutate caches accordingly. Tie `aria-live` toasts and event stream updates to this feed.
5. **Shared services & experiences** – Continue using the existing API folder for all REST calls. Introduce a lightweight `toastService` (could be local state or `useUIStore`) to queue success/warning/error messages triggered by user actions (e.g., kill session, archive restore). Keep plan modals hooking to `plansApi` methods for planning/execution flows.

## 3. Prioritized implementation checklist (with responsible flows)

1. **Task board data integration (Highest priority)**
   - Swap static `columns` with data from `useTasks()` grouped by `status` (`backlog`, `today`, `tomorrow`).
   - Compute `focusLaneTasks` from tasks with `task.isFocus === true` or `priority === 'P0'` + `status === 'today'`.
   - Wire `Start`/`View results` buttons to `useMoveTask`/`useUpdateTask` and keep drag-drop highlight outlines.
   - Data-flow update: tasks API → React Query cache → column props.
   - Accessibility: task cards need consistent tab order, `aria-label`s for actions, focus states on start button.
2. **Header + metric/filter row**
   - Render `KanbanHeader` component with nav pills, search input (updates `useUIStore.searchQuery`), and quick action icon buttons.
   - Build metric strip component that derives KPIs from `tasks` + `reports` (goal health, active executions, stalled approvals, throughput). Use `aria-live` for numeric changes.
   - Filter row should render priority chips + highlight toggle bound to `useUIStore.filterPriority` and `useUIStore.todayHighlight`. Chips should announce state via `aria-pressed`.
3. **Right rail + monitoring modules**
   - Hook `useAgents` for active agent cards, `useSessions` for past sessions + kill action, `useReports` for reports list.
   - Each panel must include accessible labels, refresh buttons (call `queryClient.invalidateQueries`), and status dots from statuses returned by APIs.
   - Data-flow: `active-sessions` file → API → hook → rail.
   - Add `Execution progress` block using aggregated data (total steps, % complete).
4. **Archive modal + toast area**
   - Create floating `ArchiveFAB` opening modal; read archived items via `useArchive()` and allow restore/delete actions referencing `useDeleteTask` + `archive` endpoints.
   - Toast area should subscribe to `useEvents` and WebSocket updates, showing success/error states with `aria-live="polite"`.
   - Accessibility: modal traps focus and returns focus to FAB; toasts use icons + text (color+icon for non-color cues).
5. **Agent manager view + modals**
   - Ensure header view switch toggles `AgentManager` component (already under `components/AgentManager`). Confirm Agent Manager uses `useAgents`, `usePlans`, `useSessions` etc.
   - Integrate plan modals so they reuse layout tokens from spec.
   - Accessibility: modals (`role=dialog`), focus management, close shortcuts (Esc). Use `prefers-reduced-motion` variants for animations.
6. **Performance & polish**
   - Add `prefers-reduced-motion` handling for glow/transitions.
   - Lazy load heavy modules (e.g., right rail) on smaller screens.
   - Confirm responsive breakpoints from wireframe (>=1440, >=1024, >=768, <768).

## 4. Data-flow & service updates

- **Tasks**: `GET /tasks` drives board columns, metrics, focus lane, quick filters, and plan controls (status + plan readiness). `POST /tasks` backs `+ New Task`; `POST /tasks/:id/move` + `PATCH /tasks/:id` update status/results. Query cache invalidation via React Query + WebSocket events.
- **Agents**: `GET /sessions/active` + `POST /sessions/:id/kill` power the Active Agents rail and kill buttons. Real-time updates need WebSocket `agent-update` events.
- **Sessions/Reports**: `GET /sessions/history`, `GET /reports` feed Past Sessions and Reports cards. Use query hooks and revalidation after kill/report actions.
- **Archive**: `GET /archive`, `POST /tasks/:id/restore`, `DELETE /tasks/:id` (or `archiveTask`) update archive modal and board data. Ensure modal uses optimistic updates.
- **Events**: `GET /events`, WebSocket events feed the Event Stream and toast area. Keep `aria-live` set to `polite` and ensure new entries push to top of stream.
- **Plans**: `GET /plans/:taskId`, `POST /plans/:taskId/planning`, `POST /plans/:taskId/execute`, `PUT /plans/:taskId/approve` used by modals and may display statuses on cards.

## 5. Accessibility & QA checkpoints

- All interactive controls (header pills, filter chips, start buttons, rail actions) include `aria-pressed`, `aria-label`, and visible 2px focus ring (#5AE3FF).
- Toasts/events area uses `role=status` + `aria-live="polite"`. Archive modal is `role=dialog`, traps focus, and restores focus to FAB after close.
- Ensure `prefers-reduced-motion` disables glows/transitions while keeping layout state.
- Confirm high-contrast text per spec (white on #141933, chips abiding 11.2:1 ratio) and include icons/text for color-coded statuses.
- Keyboard navigation: tab order matches visual stacking (header → filter → board → rail). Drag-and-drop accessible via button controls for start/plan.

## 6. Confirmation / Constraints

- The integration will not introduce new git commits or pushes; work is staged locally for review only.
- We will reuse the `kanban-agent-ui` prototype assets and replace mock data with real API surfaces while preserving UI polish.
- Responsive behavior follows the wireframe breakpoints; mobile view will collapse rail into accordion/panel controlled via `Monitoring` FAB.
