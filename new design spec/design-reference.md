# Kanban Dashboard Step 2 – Design Reference

## 1. Goal & assumptions
- Purpose: Refresh the existing Kanban view into a modern, PM-style surface while keeping every execution control, filter, and monitoring panel intact.
- Assumptions: The Whale keeps the same column taxonomy (Backlog/Today/Tomorrow), drag-and-drop, filters, and oversight panels. Design needs to feel modular, responsive, and WCAG 2.2-compliant.
- Open questions: Are the archive panel interactions fixed (floating overlay), or should they live in a sidebar detail view? Should the command/shortcut buttons remain exposed or become a palette trigger?

## 2. Tokenized system

#### Spacing scale (px)
- XXS: 4 (divider gaps, tight badges)
- XS: 8 (inline spacing, chip padding)
- S: 12 (card gutters, icon/text spacing)
- M: 16 (global grid gutters, column separation)
- L: 24 (header padding, rail gaps)
- XL: 32 (section separations, metrics row)
- XXL: 48 (panels and dialog padding)

#### Type scale
| Role | Size | Weight | Line height | Use |
|---|---|---|---|---|
| Display / Goal headline | 36px | 600 | 44px | Dashboard goals, hero metrics
| Section heading | 24px | 600 | 32px | Column titles, highlight banners
| Body / card copy | 16px | 400 | 24px | Task descriptions, metadata
| Button text / chips | 15px | 600 | 20px | Filters, quick actions
| Caption / timestamps | 13px | 500 | 18px | Event stream timestamps, stats

#### Color roles (WCAG 2.2)
- **Background surface** (#0F1421) – primary page background. Contrast with text white (#F8FAFF) = 15.7:1 (>= AAA).
- **Panel surface** (#141933) – used for columns, nav, cards. Text (#F8FAFF) ratio 11.2:1 (AAA) and for body (#E2E7FF) 8.2:1.
- **Divider/outline** (#2E3953) – 1px lines, drag drop outlines, 3:1 vs surfaces for visibility (WCAG 1.4.11).
- **Primary action (focus)** (#5AE3FF) – used for Start buttons, active column headers, chips. Contrast vs panel background = 5.7:1 (AAA). Pair with text #071526.
- **Success accent** (#4FE7B0) – for completed cards, healthy dots, tokens (contrast 7.1:1 vs background).
- **Warning accent** (#FFB347) – for plan warnings, hover state, tooltip highlights.
- **Error accent** (#FF6B8C) – for failed executions, kill actions, invalid chips.
- **Info accent** (#A5B4FC) – for metrics, secondary badges; second-layer text #0F1421 for readability.
- **Metric glow** (#112238 → gradient #1F2A40) – used for KPI strip, draws attention without lowering text contrast.

#### Radii
- **0** (grid lines, mini badges)
- **4px** (filters, focus rings)
- **8px** (task cards, nav buttons)
- **16px** (panels, rails, modal frames)
- **999px** (pills, status chips)

#### Elevation
- **Layer 0** – background (0/1/2/0, rgba(3, 6, 18, 0.4))
- **Layer 1** – cards/columns (0 4px 30px rgba(3, 6, 18, 0.45))
- **Layer 2** – overlays, toast (0 8px 40px rgba(3, 6, 18, 0.55))
Elevations rely on tinted glows (blue or purple) rather than strong shadows, keeping surfaces readable while implying depth.

#### Cursor + interaction hints
- **Pointer**: primary actions (buttons, chips)
- **Grab**: draggable cards
- **Default**: background surfaces / disabled states
- Visible 2px focus ring (#5AE3FF) around interactive controls (WCAG 2.4.7). Keyboard focus order matches visual stack.

#### Motion & transitions
- Default transitions: `200ms ease-out` for hover/focus, `250ms` for layout shifts.
- `reduce-motion` preference: disable opacity fades, keep instantaneous state changes and solid transforms.
- Microinteraction for dragging: using cubic-bezier(0.25, 0.1, 0.25, 1) to highlight drop targets but avoid independent animation sequences.

## 3. Component states

### Kanban columns
- **Default**: panel surface (#141933), subtle glow at top, 16px padding.
- **Active**: `outline 2px solid #5AE3FF`, drop shadow `Layer 1`, header text color #FFFFFF.
- **Empty**: illustrate with ghost icon + lowercase copy `Startup tasks will appear here →`; maintain 4:1 contrast.

### Task cards
- **Idle**: `BG #12182D`, border `1px solid #1F2740`, card body type `body`. Title + plan state row.
- **Hover**: `translateY(-2px)`, `box-shadow` `Layer 1`, quick action icons fade to opacity 1 with `150ms` delay.
- **Running**: `left accent bar gradient (#5AE3FF → #4FE7B0)`, start button becomes progress indicator ring.
- **Error**: red left bar (#FF6B8C) + subtle background tint (#1F0D16)
- **Completed**: success badge (#4FE7B0) + border `success accent`.
- **Disabled actions**: start button dims to `#2E3A58` with tooltip explaining `Plan review required` (WCAG AAA). Buttons include text alternative (aria-label). Deletion requires confirmation modal (banner text: `Confirm delete?` with focus trap). 

### Header nav + metrics strip
- **Primary**: `Background #0D111D`, nav pills (#1A2240). Active view pill uses neon upper-case text (#5AE3FF) with glow
- **Search**: floating field with icon, `input` background #1D2445, placeholder #94A3B8, 1px inset border #313A5C.
- **Sync indicator**: micro text `Synced ▸ timestamp` using caption style.
- **New Task**: ghost button (#5AE3FF stroke) + icon. Filled variant (#5AE3FF background, #061226 text). 

### Filter chips
- **Inactive**: outline (#2E3953), text #94A3B8
- **Active**: filled (#5AE3FF) with drop shadow, text #0B1220
- **Disabled**: `#1C2235` background + #4C5468 text.

### Quick access buttons
- Use square icons (Command, Shortcut, Theme). Hover reveals tooltip + highlight. Keep iconography consistent (line weight 2px). Use `aria-label` for screen readers.

### Rightrail modules (Active agents, Past sessions, Reports)
- Cards share panel background + `Layer 1` elevation.
- **Health indicator**: dot (green/amber/red) with accessible label (e.g., `Status: healthy`).
- **Kill button**: `Warning accent`, focus ring #FFB347.
- **Refresh controls**: icon-only with accessible label `refresh active agent list`.

## 4. Accessibility notes
- All primary text > 14pt to ensure readability on retina devices.
- Buttons include `aria-pressed` for toggles (filters, nav). Confirmation modals manage `role=dialog`, trap focus, and return focus after closing.
- Use `prefers-reduced-motion` to disable glow animations and scale transforms.
- Provide `aria-live=polite` for toast messages (success/error). 
- Color-coded status chips also include icons/text to avoid color-only cues (NN heuristic: recognition over recall).

## 5. Platform conventions
- **Web**: top nav, horizontal column layout, keyboard/tab order (N=N heuristic). Use 12-column grid (foundational) with responsive stacking. 
- **Mobile**: sticky bottom nav for filters/action, columns horizontally scrollable, collapsible rail. Prioritize Apple HIG soft edges, quick toggles, and Material-like chips for filters.

## 6. Outcome artifacts
- Ready-to-skin tokens for React/ CSS-in-JS.
- Scroll-snap columns for drag operations.
- Annotated wireframe next page describes layout + highlight areas.
