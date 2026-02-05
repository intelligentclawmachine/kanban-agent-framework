# React Migration Plan - Pre-Implementation Responses

## Questions from Migration Document

### 1. Are there any critical features in current dashboard not documented in the spec?

**Yes, several critical features exist that should be addressed:**

1. **Plan Review & Approval Flow**
   - The spec mentions `PlanReviewModal` but doesn't detail the approval/rejection workflow
   - Current system shows plan in modal with "Approve" / "Request Changes" buttons
   - Missing: Plan comparison view (if multiple iterations), approval history

2. **Session Kill/Terminate**
   - The spec mentions sessions but not the ability to kill running agents
   - Current dashboard has a kill button for active sessions
   - Critical for cost control and stuck agents

3. **Execution Reports & Output Files**
   - Spec mentions `ReportModal` but not file browsing/linking
   - Current system shows "What Was Accomplished" with file links
   - Missing: Direct file opening, output preview

4. **Task Priority System (P0-P3)**
   - Spec doesn't mention priority colors/badges
   - Current dashboard uses color coding (red=P0, orange=P1, etc.)

5. **Agent Type Icons & Badges**
   - Spec mentions agent types but not visual representation
   - Current system shows emoji icons per agent type

6. **Past Sessions Horizontal Scroll**
   - Spec has `ActiveSessions` but not the horizontal "Past Sessions" bar
   - Current UI shows completed sessions in a scrollable row

7. **Archive & Restore**
   - Spec mentions Archive component but not restore functionality
   - Current system can restore archived tasks to backlog

8. **Event Stream/Activity Log**
   - Not mentioned in spec
   - Current dashboard has event stream panel

### 2. Is there existing test data for load testing, or should that be generated?

**No existing test data - must be generated.**

Current state:
- `tasks.json` has ~10 tasks (mix of done/active)
- No load testing dataset exists
- Files are created per-execution, no synthetic outputs

**Recommendation for load testing:**
Generate synthetic data:
- 50+ tasks across all columns
- 10+ completed sessions with varied durations
- 5+ active sessions at different progress points
- Mix of all agent types
- Varied priority levels

---

## Implementation Recommendations

### Phase Priorities

**Must-Have (Core Migration):**
1. Kanban board with drag-and-drop
2. Task CRUD + modals
3. Active sessions display
4. WebSocket integration
5. React Query data fetching

**Should-Have (Feature Parity):**
1. Plan review/approval flow
2. Session kill functionality
3. Execution reports with file links
4. Priority badges
5. Archive/restore

**Nice-to-Have (Enhancements):**
1. Event stream
2. Advanced filtering
3. Cost analytics

### Critical Integration Points

1. **Express Backend** - Must remain unchanged
2. **WebSocket Messages** - Current format:
   - `task-updated`, `task-created`, `task-deleted`
   - `session-started`, `session-progress`, `session-completed`
   - `plan-ready`, `plan-approved`

3. **API Endpoints** - All existing endpoints preserved:
   - `GET /api/v1/tasks`
   - `POST /api/v1/tasks`
   - `PUT /api/v1/tasks/:id`
   - `POST /api/v1/tasks/:id/move`
   - `POST /api/v1/plans/:id/planning`
   - `POST /api/v1/plans/:id/execute`
   - `GET /api/v1/sessions/active`
   - `POST /api/v1/sessions/:id/kill`

### Technical Decisions

1. **State Management:**
   - React Query for server state
   - Zustand for UI state (modals, panels)
   - WebSocket for real-time updates

2. **Styling Approach:**
   - CSS Modules for component isolation
   - CSS variables for theming (maintain current dark theme)
   - Copy existing color scheme exactly

3. **File Structure:**
   - Feature-based organization (components/KanbanBoard, components/Modals)
   - Hooks co-located with API layer
   - Store for global UI state

---

## Answers Summary

1. **Missing features:** Plan approval workflow, session kill, file browsing, priority badges, past sessions bar, archive restore, event stream
2. **Test data:** Must be generated - no existing load test dataset
3. **Backend changes:** Zero changes required - fully backward compatible
4. **Migration strategy:** Incremental - get board working first, then add modals, then polish

---

*Response prepared by: Telli*
*Date: 2026-02-05*
