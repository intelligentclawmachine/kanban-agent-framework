# Kanban Agent UI (New design prototype)

This repository now ships a single-page React dashboard that mirrors the high-fidelity "new design spec" for the Kanban Agent UI. The UX focuses on the Kanban header, metric strip, filter pills, three columns (Backlog, Today, Tomorrow), right rail modules, archived overlay, and complementary monitoring / toast affordances. Interaction is static; cards use mock data but expose focus/hover states, badges, and accessible controls so the visual system can be reviewed before wiring real API calls.

## Getting started (run / build / test)

```bash
npm install
npm run dev        # starts Vite dev server on http://localhost:5173
npm run build      # produces production-ready assets under dist/
npm run test       # runs linting (test hook is an alias for lint)
```

`npm run lint` internally sets `ESLINT_USE_FLAT_CONFIG=false` so the legacy `.eslintrc.cjs` file is respected while ESLint v9 is installed.

## Manual validation

1. **Header + goal highlight** – Confirm the header pill switcher, sync indicator, search field, refresh/+New Task buttons, and command shortcuts are arranged per the spec. The goal spotlight card right below the header should show the sprint goal, percent, health chip, and stalled counter.
2. **Metrics + filters** – Scroll the horizontal metric strip to see the KPI cards with icon, delta, and description, then interact with the filter chips and the "Today highlight" toggle so their active styles appear.
3. **Kanban columns** – Validate that the Backlog/Today/Tomorrow columns show counts, add buttons, focus lane (Today), and task cards with colored status badges, priority pills, attachments, and start/view buttons. Hover a column to see the drop-target outline.
4. **Right rail modules** – Check the Active Agents, Past Sessions, Reports, and Monitoring sections on the right. Health dots, kill/refresh controls, and stats badges should reflect the mock data.
5. **Archive overlay & toasts** – Click the floating Archive FAB in the lower-right to open the modal listing archived work, with Restore/Delete buttons and priority pills. Also verify the persistent toast stack at bottom-right.
6. **Responsive behavior** – Resize the window to tablet/mobile widths: the layout should stack the rail below the board, the Kanban columns should horizontally scroll, and the FAB should remain accessible.

## Mock data & integration points

All placeholder data (tasks, agents, reports, metrics, archive list, toasts) lives inside `src/data/dashboardData.ts`. Replace these exports with real API calls or Zustand selectors as soon as the backend surface stabilizes. The Kanban component simply loops over `kanbanColumns`, so swapping the exported arrays with data from `fetch`/`useQuery` means the rest of the layout and styling stay intact.

## Styling system

The visual system is centralized in `src/index.css`:

- `:root` defines spacing tokens (xs/xxl), color roles (background, panel, primary, success/warning/error), radii, and elevation constants to match the spec.
- Focus states, reduced-motion overrides, scroll-snap for the columns, and sticky/pinned elements (filter row, goal lane) live there as well.
- The layout uses CSS grid for the board+rail, horizontal metric scroll, gradient focus lanes, and the floating Archive FAB.

## Notes

- We intentionally kept drag-and-drop simulated by highlighting columns on hover instead of wiring a DnD library; real drag/drop can be layered in later.
- `prefers-reduced-motion` is respected by zeroing transition durations inside `index.css`.
- The Toast area uses `aria-live="polite"`, and the Archive modal traps focus via manual `ref` handling for accessibility.
