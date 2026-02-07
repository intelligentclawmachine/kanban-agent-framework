# Kanban Dashboard Audit (Step 1)

## Annotated Requirements
1. **Column structure + counts** – `STATUS_ORDER` enumerates `backlog`, `today`, `tomorrow`, and `done`. The current board renders the first three, each with a column header, task count, add-task (+) button, and empty-state illustration when no tasks appear. These columns organize work-by-day and must stay so the user preserves the same mental model and can add tasks in-context.
2. **Column drag & drop** – The board is wrapped in DnD context with a drag overlay, drop zones tied to each column, and handlers that call `useMoveTask` so dropping a card mutates its status. This affordance is core to Kanban workflow and must remain (including the visual drag overlay and the drop-target highlight states).
3. **Task card affordances** – Each card shows a start button (▶/Running), a colored alphabetic status badge (draft → executing → error), borders for completed tasks, the title/description/expected output, attachment count, and inline actions (view results, edit, delete). The start button enforces plan-first logic (`planFirst` flag, plan-ready → execution) and disables while executing; delete needs confirmation. All of these controls and status cues must survive since they surface execution state and CRUD actions.
4. **Header navigation + sync** – The header shows the Kanban vs Agent Manager view switcher, a `Synced` indicator, search input, refresh and +New Task buttons, and (currently stubbed) commands/shortcuts/theme buttons. The search + refresh + new-task controls anchor the primary workflows, so the redesigned toolbar must keep them with similar placement/tap targets.
5. **Priority filter bar (and quick actions)** – Beneath the header runs `FilterBar` with chips for All/P0–P3, plus quick buttons for commands/shortcuts/theme toggles. Users rely on these chips to filter by urgency, so the redesign should retain a quick chip row, active state, and the same quick action affordances (even if the command buttons get new icons/text).
6. **Active + past agent monitoring** – Right panel includes Active Agent cards (health dots, elapsed timer, current step & model info, kill button) and Past Sessions list (status icons, cost/duration/token stats) with refresh buttons. Real-time oversight and ability to stop agents are critical to execution safety, so keep the two-card sections with their counts, refresh controls, health metadata, and stop action.
7. **Execution reports** – The Reports bar (Done section) summarizes completed executions with refresh/archive/clear buttons, colored error treatments, cost/time/steps stats, and previews of output files (Open in Finder button). Completed work needs the same emphasis on cost, duration, and attached files so we can surface failed runs and post-mortems.
8. **Archive + restore flows** – The modal-style Archive panel (toggled from the report header) lists archived tasks with priority/date badges and Restore/Delete buttons. This panel must remain accessible from the main UI because it is the only place to rescue or purge past work.
9. **Event stream + execution progress** – An event log (title/description/timestamp cards) and a progress mini-panel keep users aware of system status; they reflect heartbeat updates and the running execution progress bar text. The redesign should keep these panels to satisfy NN heuristic #1 (visibility of system status).
10. **Agent Manager view & Plan workflow** – The header view switcher leads to the Agent Manager page (grid/list view, agent cards, filters, modals). Even though we are redesigning the Kanban style, that alternate view still exists and must remain reachable (same switcher). Similarly, the PlanReviewModal + Plan/Execution hooks (approve, regenerate, plan-first gating) are part of the execution story and any polish should support invoking those modals from task cards.

## Preservation Checklist
- [ ] Preserve Backlog / Today / Tomorrow columns, their counters, per-column add task button, and empty-state messaging
- [ ] Keep drag/drop affordance with overlay + drop highlight and `useMoveTask` mutation when a card crosses columns
- [ ] Retain TaskCard start button (▶/Running state) that handles `planFirst`, `plan-ready`, and plan execution flows, plus disable state and inline status badge with icons
- [ ] Maintain inspection actions: View results (when completion summary exists), Edit, Delete (with confirmation), Attachments indicator, and expected-output copy
- [ ] Keep header-level search, refresh, +New Task buttons, view switcher, sync indicator, and auxiliary commands/shortcuts/theme buttons
- [ ] Keep the priority chip filter row (All + P0–P3) and their active styling, plus the quick-access buttons to invoke commands/shortcuts
- [ ] Retain Active Agents section with health dots (healthy/slow/stale), elapsed timer, kill button, and refresh
- [ ] Retain Past Sessions list with status icons, cost/duration/token stats, refresh, and totals bar
- [ ] Keep the Reports/Done panel with error-style cards, stats (min/cost/steps), file preview badges, archive toggle, and ability to open output files
- [ ] Preserve Archive panel overlay with Restore/Delete controls, priority badges, and empty state messaging
- [ ] Keep Event Stream listing the last ~50 events with timestamped cards
- [ ] Keep Execution Progress mini-panel with progress fill and status text
- [ ] Continue to show toast notifications for success/error feedback (used by delete, kill, e.g.)
- [ ] Keep the Agent Manager view switcher in the header so users can still jump to agent management without needing to rebuild navigation

## Assumptions / Questions
- I assume the `done` status is intentionally handled outside the main board (reports show completed work) so it can stay hidden; confirm if a visible Done column is required for the redesign.
- Plan-first logic (when `planFirst` true or executionStatus = `plan-ready`) is critical for approvals; verify the new layout still needs plan review/PlanReviewModal affordances before execution.
- The command/shortcut/theme buttons are placeholders today—should they stay as buttons with hover states or become a dedicated command palette instead?
- Reports panel currently shows 3 output files before collapsing; confirm if this file-preview limit and the Finder button are still needed in the new visuals.
- Archive/restore flows are controlled through Zustand; confirm we should keep the floating archive panel or integrate it into another screen.
