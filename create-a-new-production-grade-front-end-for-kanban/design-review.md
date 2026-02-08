# Design Review — `new-dashboard-design` branch

## Design system & tokens (source: `kanban-agent-ui/src/index.css` + `new design spec/design-reference.md`)
- **Spacing scale**: XXS=4px, XS=8px, S=12px, M=16px, L=24px, XL=32px, XXL=48px — layers, gutters, and panel padding follow this scale.
- **Type scale**: Display 36px/600, Section Heading 24px/600, Body 16px/400, Button/Chips 15px/600, Caption 13px/500; consistent line heights (44, 32, 24, 20, 18 respectively).
- **Color roles**: Background `#0F1421`, panel surfaces `#141933`/`#1D1F2F`, borders `#2E3953`, primary `#5AE3FF`, success `#4FE7B0`, warning `#FFB347`, error `#FF6B8C`, info `#A5B4FC`, text `#F8FAFF`, muted text `#E2E7FF`, glow gradients for metrics strip (`#112238 → #1F2A40`). All contrasts meet WCAG 2.2 (AAA) as documented.
- **Radii & elevation**: Radii tiers 0 / 4 / 8 / 16 px + 999px pills; elevations mimic layered glows (`Layer 0` background, `Layer 1` cards, `Layer 2` overlays) with tinted shadows rather than harsh drops.
- **Interaction cues**: Pointer for buttons/chips, grab for drag, 2px neon focus ring (#5AE3FF), `reduce-motion` preference disables fades, transitions 200–250ms, drag highlighted by cubic-bezier over drop targets.

## Layout + component anatomy (per `layout-wireframe.md` + React prototypes)
1. **Header** (`GlobalHeader` / `.global-header`): brand pill + view switcher (Kanban vs Agent Manager), sync/timestamp pill, command search field, refresh, +New Task, command/shortcut/theme icons.
2. **Metric strip** (`MetricStrip.tsx` + `.metrics-strip`): scrollable KPI cards (Goal, Active executions, Stalled approvals, Throughput) with tone classes (`metric-success`, etc.), icons, label/delta/description, highlight glow and gradients replicating spec.
3. **Filter controls** (`FilterRow.tsx`, Filter chips, `.filter-row`): chip stack for All/P0–P3 with active states, command palette + `Today highlight` pills with toggle styling, secondary-pill classes reused elsewhere.
4. **Kanban board**: 12-column grid with `gap: 16px`, columns (Backlog/Today/Tomorrow) referencing spec counts, `Goals lane` overlay, focus lane for P0 tasks, cards with start/edit/delete actions, status badges, attachments, drag-target outlines, and empty-state copy.
5. **Right rail modules** (`RightRail.tsx` and CSS): stacked panels for Active agents, Past sessions, Reports, Monitoring. Each module uses `.rail-module`, `.rail-card`, status dots, refresh/kill buttons, stats, and is designed to collapse via accordions or floating tray on smaller screens.
6. **Archive & toasts**: Floating archive FAB opens modal/panel (`ArchiveModal` + `ArchivePanel.css`) with pill badges, restore/delete, trap focus; toasts mounted in `ToastArea` with `aria-live`.
7. **Responsive behavior**: Desktop (>=1024px) keeps columns + rail; tablet (768–1023px) stacks rail below board with snap scrolling; mobile (<768px) collapses nav to top bar + FAB, columns stack vertically, monitoring becomes bottom sheet, action bar sticks to bottom.

## Reusable patterns & behaviors to carry forward
- **Tokenized CSS**: CSS custom properties centralize spacing, colors, radii, shadows to align with spec; replicating this in main branch ensures consistent theming.
- **Buttons/chips**: `ghost-button`, `primary-button` (accent), `pills`, `secondary-pill`, `view-toggle-button` – these share consistent padding, border, hover/active states, focus rings.
- **Header + search pills**: view pager, command search shell, sync pill, icon buttons, search field placeholder `⌘K` (command palette) bring clarity.
- **Metric/goal paradigms**: `metrics strip` cards, `goal spotlight`, health chips, `stalled` indicator – good blue/purple gradient glows for status emphasis.
- **Kanban column layouts**: column cards with start/plan controls, status/priority chips, counts, drag highlight overlays; empty-state messaging and focus lane replicate spec and should map to real data rendering.
- **Right rail modules**: consistent `.rail-module`, `.rail-card`, `.status-dot`, `.ghost-mini`, `.danger-mini`; modular sections (Active agents, Past sessions, Reports, Monitoring) align with live data and can be refilled via proper hooks.
- **Archive + toast patterns**: consistent layering (Layer 2) and trap focus ensures accessible overlays; same can be reused when wiring to server data.

## Comparison to `main` branch (live dashboard) – functionality vs prototype
| Area | `main` branch | `new-dashboard-design` prototype |
| --- | --- | --- |
| App shell | `App.jsx` renders dynamic components (`Header`, `ActiveSessions`, `FilterBar`, `KanbanBoard`, `RightRail`, `ReportsBar`, `ArchivePanel`, `ExecutionProgress`, Plan/Session/Report modals, AgentManager) and wires `useWebSocket` + `useUIStore`. | `App.tsx` renders static mock data and simplified layout (header + metrics + board + rail) without data hooks. | 
| Data layer | `main` uses hooks (`useSessions`, `useWebSocket`), Zustand store, real API integration, WebSocket updates, and modules like `AgentManager`/`AgentCreator`. | Prototype currently uses fake exports from `data/dashboardData.ts` and no backend hooks; interactions are visual only. | 
| CSS & tokens | Main branch uses legacy CSS (App.css). | New branch centralizes tokens in `index.css`, replicating spec colors, spacing, radii, and motion, then builds component-specific styles (GlobalHeader, FilterRow, RightRail, MetricStrip). | 
| Architecture docs | Several planning docs, diagnostics, and frameworks exist in `legacy/` and `new design spec`. | Branch adds new design spec files and README describing prototype usage and manual validation steps. | 
| Build tooling | main branch uses React + Vite (App.jsx, JS) with ESLint + dev tooling; hooks to API fields. | new branch upgrades to TypeScript (App.tsx, tsconfig, QueryClient + React Query) but currently leaves API wiring for later. |

## Key gaps & risks before shipping
1. **Live data & hooks**: new branch removes `useWebSocket`, `useSessions`, `useUIStore`, and the active modules that handle real-time statuses, so the prototype currently cannot show true agent health, session state, plan review, or API persistence.
2. **Agent manager & modals**: `AgentManagerPage`, `PlanReviewModal`, `SessionViewModal`, `ReportModal`, and `TaskDetailModal` are not rendered in the prototype, so workflows like plan approval, execution review, or agent onboarding are missing (yet present in `main`).
3. **Event stream + execution progress**: Right rail mock data duplicates these modules but doesn’t connect to `events.json` or server WebSocket, so the system status view lacks real telemetry.
4. **Drag-and-drop & commands**: The prototype highlights drop targets visually but doesn’t integrate DnD logic (`@dnd-kit`) or backend `POST /tasks/:id/move`. Confirm hooking before shipping.
5. **Accessibility & focus**: Search for `.global-header` CSS references, integrate `aria` states; `grep` attempts show no dedicated styles, so ensure `GlobalHeader` has CSS definitions (maybe `Header.css`).
6. **Build/performance**: New branch introduces React Query + TypeScript; ensure lint/test tooling is wired (`npm run test` maps to lint). Also tie `App.tsx` to real data, or fallback to `main` until integration complete.

## Next actions for Step 3
1. Align component tokens and CSS (from `index.css` & spec) with the live layout so colors/spacing match when hooking to real data.
2. Map static data (from `kanban-agent-ui/src/data/dashboardData.ts`) to API/WebSocket feeds (`useSessions`, `useWebSocket`).
3. Reuse the reusable patterns/caps (header, filter chips, metric cards, rail modules, Archive + toasts) but connect them to live state updates.
4. Document missing pieces (AgentManager interactions, modals, plan workflows) so future developer knows which modules still need wiring.
5. Keep new design spec files as reference for QA (spacing, breakpoints, motion) and include them in final documentation.

*Report generated after reviewing both branches, the new design spec, CSS tokens, and major components.*
