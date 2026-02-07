# Kanban Dashboard Step 2 – Layout Wireframe

## 1. Grid & breakpoints
- **Base grid**: 12-column CSS grid, 16px global margin, 24px gutters. Content max-width 1380px, centered.
- **Breakpoints**:
  - `>=1440px`: three-column layout (main board 64%, rail 32%, margin). Horizontal metrics strip spans full width.
  - `>=1024px`: two-column layout (board 70%, rail 30%); header includes search + controls.
  - `>=768px and <1024px`: stack rails below board, board columns show 2 at once (horizontal scroll). The nav condenses to icon-only and filter row stacks vertically.
  - `<768px`: single-column stack. Board columns shrink to 75% width, scrollable; nav becomes sticky top bar with hamburger to reveal actions.
- **Density**: 8px base spacing keeps cards legible; on compact > desktop, reduce horizontal padding to 12px but keep vertical 16px.

## 2. Layout zones (annotated)
```
+-------------------------------------------------------------+
| [1] Global header (view switcher, live sync, search, action) |
+-------------------------------------------------------------+
| [2] Metric strip (goals, throughput, capacity, alerts badge) |
+-------------------------------------------------------------+
| [3] Filter row (priority chips, quick actions, command palette)|
+-------------------------------------------------------------+
| [4] Main area ------------------------------------------------+
| | +---------------------------------------------+ +--------+ |
| | | [5] Kanban columns container (Backlog | Today | Tomorrow) | |
| | | - Column heads w/ counts + add task button             | |
| | | - Card list with start/plan controls                   | |
| | | - Drag overlay + drop target highlight (blue glow)     | |
| | +---------------------------------------------+ +--------+ |
| | | [6] Right rail (active agents | past sessions | reports) | |
| +-------------------------------------------------------------+
| [7] Footer / archive access (floating badge to open panel)  |
+-------------------------------------------------------------+
```

### Annotations
1. **Global header**: left brand + view toggle, `Synced` indicator, search field with command-+ placeholder, `Refresh`, `+ New Task`, and icon buttons (Command, Shortcuts, Theme). Focus ring 2px neon.
2. **Metric strip**: horizontally scrollable KPI cards (Goal score, Work in progress, Throughput). Each card includes value + delta; top-right indicator for `Stalled` count.
3. **Filter row**: sticky when scrolling; priority chips with pill states, command palette button, and `Today highlight` toggle. Chips use accessible icons for status.
4. **Main area**: uses CSS `grid-template-columns: repeat(3, minmax(280px, 1fr))` for columns, with `gap: 16px`. Column headers include active state (blue underline). Drag handles appear on hover.
5. **Right rail**: stacked modules with consistent card spacing: Active agents (with timers, kill, refresh), Past sessions list (status dots, cost/time stats), Reports (error highlights, open output). On smaller screens, rail collapses into accordion for each panel with `aria-expanded` toggles.
6. **Columns** highlight: `Goals lane` overlay pinned above `Today` to show sprint objective, `Focus lane` at top of `Today` column for P0 tasks.
7. **Footer / Archive**: translucent floating button in bottom-right opens modal/panel listing archived tasks (restore/delete). Panel uses `Layer 2` elevation and trap focus.

## 3. Responsive behaviors
- **Desktop (>=1024px)**: columns fully visible, rail persistent. Right rail width limited to 340px.
- **Tablet (768-1023px)**: board extends full width; use horizontal snap for columns. Right rail collapses into tray accessible via floating tab labelled `Monitoring`.
- **Mobile (<768px)**: navigation condenses to top bar, metrics scrollable. Kanban columns stack vertically; the rail becomes bottom sheet toggled via `Monitoring` FAB. Drag is vertical; drop targets expand full width. Action bar sticks to bottom with `+ New Task`, `Filters`, and `Archive` quick actions.

## 4. Highlight areas
- **Goal spotlight**: full-width card directly below header showing current sprint goal, percent complete, and `Goal health` indicator (derived from metrics). When health < 70%, shows yellow warning chip.
- **Metrics row**: tongue of cards showing throughput, WIP, cost/time (connected to reports). Each KPI uses icon + label + value, ensuring recognition. Use `aria-live` to update values when data changes.
- **Focus lane**: top of `Today` column reserved for urgent tasks. Visual treatment: left accent gradient bar (#5AE3FF) tinted, background lighten to `#141A2C`, label `Focus lane` with icon. Tasks here have higher card elevation.

## 5. Navigation & workflow
- Primary nav sits in header (Kanban vs Agent Manager). Secondary nav (filters, commands) sits below. On mobile, nav collapses into a segmented control.
- Drag overlay: drop target highlight extending across column, turning `#5AE3FF` (0.35 opacity) when dragging over target.
- Notifications: toast area anchored to bottom-right (Layer 2) with success/error icons, fits into zone 7.
