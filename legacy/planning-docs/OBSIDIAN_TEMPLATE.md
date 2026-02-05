# Obsidian Integration Guide

## Quick Setup

1. **Create Templates Folder** (if not exists):
   ```
   ~/Documents/Obsidian/Templates/
   ```

2. **Copy Task Template**:
   The task template is already saved at:
   ```
   ~/Documents/Obsidian/Templates/Task-Template.md
   ```

3. **Enable Templates** in Obsidian:
   - Settings → Templates → Template folder location: `Templates`

---

## Using the Template

When creating a new task note in Obsidian:

1. Use Obsidian's quick switcher (`Ctrl+O`)
2. Type `Task:` followed by task title
3. Select "Use Template" and choose "Task-Template"
4. Fill in the YAML frontmatter:
   - `id`: Auto-generated UUID (leave as-is or generate new)
   - `title`: Task title
   - `priority`: P0 (critical), P1 (high), P2 (medium), P3 (low)
   - `status`: today, tonight, backlog, done
   - `dueDate`: ISO date format (YYYY-MM-DD)
   - `tags`: Comma-separated tags

---

## DataviewJS Queries

Add these queries to any Obsidian note to display your Kanban tasks:

### All Active Tasks
```dataviewjs
const tasks = dv.pages('"Tasks"')
  .where(t => t.status !== "done" && t.status !== "deleted")
  .sort(t => t.priority)
  .sort(t => t.dueDate);

dv.table(
  ["Task", "Priority", "Status", "Due"],
  tasks.map(t => [
    t.file.link,
    t.priority,
    t.status,
    t.dueDate ? t.dueDate.split('T')[0] : '—'
  ])
);
```

### Today's Tasks Only
```dataviewjs
const today = dv.pages('"Tasks/today"')
  .sort(t => t.priority);

dv.table(
  ["Task", "Priority", "Due", "Tags"],
  today.map(t => [
    t.file.link,
    t.priority,
    t.dueDate ? t.dueDate.split('T')[0] : '—',
    t.tags ? t.tags.join(', ') : '—'
  ])
);
```

### Overdue Tasks
```dataviewjs
const now = dv.date("now");
const overdue = dv.pages('"Tasks"')
  .where(t => t.dueDate && t.dueDate < now && t.status !== "done")
  .sort(t => t.priority);

if (overdue.length > 0) {
  dv.header(3, "⚠️ Overdue Tasks");
  dv.table(
    ["Task", "Priority", "Due Date", "Days Overdue"],
    overdue.map(t => [
      t.file.link,
      t.priority,
      t.dueDate.split('T')[0],
      Math.floor((now - t.dueDate) / (1000 * 60 * 60 * 24))
    ])
  );
} else {
  dv.paragraph("✅ No overdue tasks!");
}
```

### Tasks by Priority
```dataviewjs
dv.table(
  ["Priority", "Count", "Tasks"],
  ["P0", "P1", "P2", "P3"].map(prio => {
    const tasks = dv.pages('"Tasks"')
      .where(t => t.priority === prio && t.status !== "done");
    return [
      prio,
      tasks.length,
      tasks.map(t => t.file.link).join(", ") || "—"
    ];
  })
);
```

---

## Sync Behavior

| Action | Direction | Trigger |
|--------|-----------|---------|
| Create task in Dashboard | → Obsidian | Auto on save |
| Edit task in Dashboard | → Obsidian | Auto on save |
| Create/edit task in Obsidian | ← Dashboard | File watcher (instant) |
| Manual sync | ↔ Both | `/api/v1/sync/obsidian/pull` or `push` |

---

## Conflict Resolution

If both dashboard and Obsidian are edited simultaneously:
1. Timestamps are compared (5-second grace window)
2. Most recent change wins
3. Conflict files created if within grace window: `conflict-[timestamp].md`
4. Manual resolution required for conflicts

---

## File Locations

| Purpose | Location |
|---------|----------|
| Dashboard | `~/Desktop/Claw Creations/agent-dashboard.html` |
| Tasks (Obsidian) | `~/Documents/Obsidian/Tasks/{status}/{id}.md` |
| API Server | `~/Desktop/Claw Creations/server.js` |
| Data Storage | `~/Desktop/Claw Creations/tasks.json` |

---

## API Reference

### WebSocket Events
```javascript
// Subscribe to real-time updates
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'tasks-refreshed') {
    console.log('Tasks updated from Obsidian:', data);
  }
};
```

### REST API
```bash
# Get task suggestion
curl http://localhost:3001/api/v1/suggestions/next?context=morning

# Force sync
curl -X POST http://localhost:3001/api/v1/sync/obsidian/pull
curl -X POST http://localhost:3001/api/v1/sync/obsidian/push

# Get sync status
curl http://localhost:3001/api/v1/sync/status
```

---

## Troubleshooting

**Watcher not detecting changes?**
- Check sync status: `/api/v1/sync/status`
- Restart watcher: `POST /api/v1/sync/watcher/toggle` with `{"action":"stop"}` then `{"action":"start"}`

**Tasks not appearing?**
- Verify Obsidian vault path: `~/Documents/Obsidian/Tasks`
- Check task YAML frontmatter has valid `id` field
- Run manual pull: `POST /api/v1/sync/obsidian/pull`

**WebSocket not connecting?**
- Ensure server is running on port 3001
- Check browser console for errors
- Server must be on same machine (localhost)