# Kanban Dashboard Step 5 — QA, Documentation & Deployment Notes

## Summary
- Synthesized the new-dashboard-design branch into the current Kanban Agent UI (current working tree is `new-dashboard-design`). The React app now exposes the redesigned global header, metric strip, filter row, Kanban board shell, right rail, and refreshed agent manager page alongside the existing modals (plans, session/report viewers, archive, agent creator).
- All critical data hooks remain active (`useTasks`, `useAgents`, `useSessions`, `useReports`, `useArchive`, `useEvents`), so the production UI continues to surface live tasks, sessions, and reports while adopting the polished prototype layout.
- The new design improvements (view toggle in the header, metric cards, sticky filter chips, today-highlight layout class, split right rail with active agents/past sessions/report cards/monitoring, archive modal, and the dedicated Agent Manager + Creator screens) are present in the current build.
- No Git commits or pushes were performed during this work (per requirements).

## Regression Testing
| Feature / Area | Test Steps | Result | Notes |
|---|---|---|---|
| Production build | `cd kanban-agent-ui && npm run build` | ✅ Pass | Vite reports successful bundle, `dist/` contains `index.html`, CSS/JS assets, and the new component tree. |
| API health | `curl http://localhost:3001/api/v1/tasks` | ✅ Pass | Existing backend on port `3001` responded with JSON containing the task catalog. |
| Server start | `node server.js` | ⚠️ Blocked | Port `3001` already bound by PID 8310 (`Node`/`redwood-broker`). Cannot start a new server without releasing the port; see Outstanding Issues below. |
| UI interaction (manual) | TODO: Run `npm run dev` and click through global header toggles, filter chips, Kanban board, agent manager, and modals | ⛔ Not executed | Environment does not expose a browser; manual verification is still required. Steps documented in "Manual QA Steps" section. |

## Coverage Notes
The new front-end retains and extends the live dashboard functionality:
1. **Header & View Modes**: Global header now contains view toggle between Kanban and Agent Manager, search inputs, refresh, new task, and archive controls, mirroring the prototype nav layout.
2. **Metrics & Filters**: MetricStrip, FilterRow, and today-highlight controls keep KPI visibility while allowing quick priority filtering and highlighting.
3. **Kanban + Right Rail**: `KanbanBoard`, `ExecutionProgress`, `EventStream`, and `RightRail` (active agents, session history, reports, monitoring) deliver the old board + telemetry features inside the refreshed shell.
4. **Agent Manager + Creator**: The alternative view loads `AgentManagerPage` plus the `AgentCreator` modal integrations, so agent profiles (with prompts, models, routing settings) are still configurable.
5. **Modals / Portals**: Task creation/detail, plan review, session views, report viewer, archive modal, and agent creator remain mounted at the root for global availability.
6. **State & Data Hooks**: Hooks such as `useTasks`, `useAgents`, `useSessions`, `useReports`, `useArchive`, and `useEvents` keep real data sync, ensuring the new UI isn't just a mock.

## Manual QA Steps (for follow-up)
1. Start backend: `cd /Users/clawmachine/Desktop/Claw Creations/Kanban Agent UI Complete && node server.js` (stop any other node on 3001 first or edit `server.js`/`start.sh` to use a free port).
2. Start frontend dev server: `cd kanban-agent-ui && npm run dev -- --host localhost --port 3000`.
3. Browser checklist (http://localhost:3000):
   - Confirm Global Header view toggle switches between Kanban and Agent Manager without losing filters.
   - Verify Metric cards reflect live counts (Goal health, Active executions, Stalled approvals, Throughput).
   - Click filter chips (All, P0–P3) and note Kanban board filters by priority + highlight toggle.
   - Drag tasks between columns; expect API `/tasks/:id/move` to persist status and `ExecutionProgress` to update.
   - Open Task modal, create/edit a task, and ensure Plan/Session/Report modals can open via context actions.
   - Use Archive + Agent Creator modals; confirm Right Rail now shows active sessions/past sessions/reports/monitoring cards with right-hand data.
   - Switch to Agent Manager view, create/inspect agent cards, and open AgentCreator to see prompts/model/tool selections.
4. Production build verification: repeat `npm run build`, copy `dist` into server’s `kanban-agent-ui/dist`, then load `http://localhost:3001/` to verify the static bundle matches the dev layout.

## Setup & Deployment Instructions
1. **Install dependencies**
   - Server: `npm install` from `/Users/clawmachine/Desktop/Claw Creations/Kanban Agent UI Complete`
   - Frontend: `cd kanban-agent-ui && npm install`
2. **Frontend dev**: `cd kanban-agent-ui && npm run dev -- --host localhost --port 3000` → open `http://localhost:3000`
3. **Frontend prod build**: `cd kanban-agent-ui && npm run build` (artifacts land in `kanban-agent-ui/dist`)
4. **Server start**: `cd /Users/clawmachine/Desktop/Claw Creations/Kanban Agent UI Complete && node server.js` (ensure port 3001 is free)
5. **Accessing UI**: After building and starting the server, visit `http://localhost:3001/` for the React SPA; `http://localhost:3001/legacy` still serves the fallback HTML.
6. **Manual data refresh**: Use the header refresh button or call `/api/v1/tasks?offset=0&limit=200` to confirm the latest data.

## Outstanding Issues & Follow-ups
- **Server port conflict**: `node server.js` cannot bind to port `3001` because PID 8310 already listens (redwood-broker). Free the port (stop that process or edit `server.js` to use another port) before rerunning QA or deployment.
- **Manual UI regression**: Full click-through of the new Kanban layout, agent manager view, and modal flows still needs a human tester; steps are documented above.
- **Design handoff docs**: While the prototype is wired in, coordinate with UX/Design to double-check spacing/color tokens if any updated palette files are introduced.

## Notes
- No Git commits/pushes were performed anywhere in the repository; all verification happened on the existing working tree.
- Build artifacts (`dist/`) already reflect the new layout (`Indice: metric strip, filter row, right rail, agent manager toggle`).
- Future automation: integrate Playwright tests that open `/kanban` and assert chip/board rendering around the new layout.
