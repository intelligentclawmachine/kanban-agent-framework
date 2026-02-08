# Frontend Redesign Plan: Surgical Integration

## Context

An agent attempted to merge a design prototype branch (`new-dashboard-design`) with the production app (`main`). The attempt failed because the branches diverged at the first commit — the design branch is missing 4 critical production commits. The result is a broken, half-migrated UI.

**Current state:** We are on `new-dashboard-design` branch with a non-functional frontend.
**Target state:** Return to `main` (fully working app) and incrementally adopt the new design components.

---

## Branch Topology

```
* eda3da7 (main) Agent Streaming
* 764ba3d Clean up repo
* 2c782ac New branch with new design, agent manager included, fully functional
* 1507ecf Restore frontend, keep execution pipeline fixes
| * ea13ee6 (new-dashboard-design) WIP: New dashboard frontend rewrite
|/
* 0cb06c3 First commit
* a121a27 Initial commit
```

`main` = fully functional production app
`new-dashboard-design` = design prototype with static mock data, missing all production code

---

## What to Salvage from the Design Branch

### Useful New Components (in `kanban-agent-ui/src/components/dashboard/`)
These TypeScript components have good design patterns worth adopting:

1. **`GlobalHeader.tsx`** (88 lines) — Brand group, view toggle (Kanban/Agents), search, sync pill, action buttons
2. **`MetricStrip.tsx`** — Goal health, active executions, stalled approvals, throughput cards
3. **`FilterRow.tsx`** — Priority filter pills (All/P0/P1/P2/P3), command palette button, today highlight
4. **`RightRail.tsx`** — Stacked accordion panels for agents, sessions, reports, monitoring
5. **`ArchiveModal.tsx`** — Archive overlay with filtered list
6. **`ToastArea.tsx`** — Toast notification display

### Useful Design Tokens (in `kanban-agent-ui/src/index.css`)
- Spacing scale: XXS (4px) through XXL (48px)
- Dark theme palette: bg `#0F1421`, panel `#141933`/`#1D1F2F`, accent `#5AE3FF`
- Elevation: layered glow system with tinted shadows
- Typography: 5-level type scale, Display (36px) to Caption (13px)
- Border radii, focus ring styles, transition curves

### Useful Strategy Docs (in `create-a-new-production-grade-front-end-for-kanban/`)
- `step1-dashboard-capabilities.md` — Full inventory of live features that must survive
- `design-review.md` — Design tokens, layout specs, component anatomy
- `integration-strategy.md` — Feature mapping table, architecture plan, prioritized checklist
- `qa-summary.md` — QA checklist for regression testing

### Useful App.tsx Wiring Logic
The uncommitted `App.tsx` on the design branch shows how to:
- Derive metrics from live data (goal health = done/total, throughput = report count, etc.)
- Map API responses to typed UI models for the right rail
- Wire search/filter state through to KanbanBoard via `useTasks(filters)`

---

## Implementation Steps

### Step 0: Prepare
1. Switch to `main` branch: `git checkout main`
2. Create a new working branch: `git checkout -b frontend-redesign`
3. Before switching, copy the design components to a temp location or reference them via `git show new-dashboard-design:path/to/file`

### Step 1: Copy Design Tokens & CSS Variables
- Update `kanban-agent-ui/src/index.css` with the new design tokens (spacing, colors, typography, elevation)
- Keep existing component CSS files but update them to use the new variables
- This is the foundation everything else builds on

### Step 2: Integrate GlobalHeader
- Copy `GlobalHeader.tsx` (or convert to `.jsx` to stay consistent) into the project
- Replace the existing `Header/Header.jsx` with the new GlobalHeader
- Wire up props: `activeView`, `onViewChange`, `searchQuery`, `onSearchChange`, `onRefresh`, `onNewTask`, `onToggleArchive`
- Delete orphaned `Header/Header.jsx` and `Header/FilterBar.jsx`

### Step 3: Add MetricStrip
- Add the MetricStrip component above the Kanban board
- Compute metrics from real data:
  - Goal health: `(doneTasks / totalTasks * 100)%`
  - Active executions: `activeSessions.length`
  - Stalled approvals: tasks with `executionStatus === 'plan-pending'`
  - Throughput: `reports.length`
- Data comes from existing hooks: `useTasks()`, `useActiveSessions()`, `useReports()`

### Step 4: Add FilterRow
- Add priority filter pills below MetricStrip
- Wire filter state to KanbanBoard — pass `filterPriority` to `useTasks({ priority })`
- Add command palette button and today highlight toggle

### Step 5: Integrate RightRail
- Add the RightRail component to the right side of the layout
- It should contain collapsible sections for:
  - Active agents (from `useAgents()`)
  - Running sessions (from `useActiveSessions()`)
  - Recent reports (from `useReports()`)
  - Event stream (keep existing `EventStream.jsx`)
  - Execution progress (keep existing `ExecutionProgress.jsx`)
- Use CSS grid to create the main layout: board area + right rail

### Step 6: Update App Layout
- Restructure `App.jsx` layout to: GlobalHeader → MetricStrip → FilterRow → [KanbanBoard | RightRail] grid
- Keep the Agent Manager view toggle working (swap board grid for AgentManagerPage)
- Keep all existing modals mounted (TaskModal, PlanReviewModal, ReportModal, SessionViewModal, TaskDetailModal, AgentCreator)

### Step 7: Polish & Cleanup
- Add ArchiveModal integration (floating FAB or header button)
- Add ToastArea for notifications
- Remove duplicate/orphaned components:
  - `components/dashboard/KanbanBoard.tsx` (orphaned prototype)
  - `components/Header/Header.jsx` (replaced by GlobalHeader)
  - `components/Header/FilterBar.jsx` (replaced by FilterRow)
- Test all features from the capabilities inventory

### Step 8: Build & Test
- Run `npm run build` in `kanban-agent-ui/`
- Start server and verify all features work:
  - [ ] Task CRUD (create, edit, delete, move between columns)
  - [ ] Drag-and-drop between lanes
  - [ ] Task execution (plan → execute → report)
  - [ ] Agent Manager (list, create, edit, delete agents)
  - [ ] Session monitoring (active sessions, health indicators, kill)
  - [ ] Reports (view, archive, clear)
  - [ ] WebSocket real-time updates
  - [ ] Search and priority filtering
  - [ ] All modals open and function correctly

---

## Key Decisions

- **Stay in JSX** for all existing components. Do NOT do a TypeScript migration at the same time as the design integration. The new dashboard components can be converted to JSX, or kept as TSX if the build handles it (Vite does).
- **Keep all existing hooks, API layer, and store unchanged.** The design is a UI-only change.
- **Do NOT change server.js.** The backend API contracts remain identical.
- **Incremental integration.** Each step should leave the app in a working state. Build and test after each step.

---

## Files to Reference on Design Branch

To view any file from the design branch without switching:
```bash
git show new-dashboard-design:kanban-agent-ui/src/components/dashboard/GlobalHeader.tsx
git show new-dashboard-design:kanban-agent-ui/src/components/dashboard/MetricStrip.tsx
git show new-dashboard-design:kanban-agent-ui/src/components/dashboard/FilterRow.tsx
git show new-dashboard-design:kanban-agent-ui/src/components/dashboard/RightRail.tsx
git show new-dashboard-design:kanban-agent-ui/src/components/dashboard/ArchiveModal.tsx
git show new-dashboard-design:kanban-agent-ui/src/components/dashboard/ToastArea.tsx
git show new-dashboard-design:kanban-agent-ui/src/index.css
git show new-dashboard-design:kanban-agent-ui/src/App.tsx
```

To view the agent's strategy docs:
```
create-a-new-production-grade-front-end-for-kanban/integration-strategy.md
create-a-new-production-grade-front-end-for-kanban/step1-dashboard-capabilities.md
create-a-new-production-grade-front-end-for-kanban/design-review.md
```
