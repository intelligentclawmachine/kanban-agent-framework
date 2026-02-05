# Technical Design Document: Obsidian-Integrated Kanban Task Management System

**Version:** 1.0  
**Date:** 2026-02-03  
**Author:** Claw Machine Agent  
**Status:** Draft for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Data Models](#data-models)
4. [API Specifications](#api-specifications)
5. [File Management](#file-management)
6. [Obsidian Integration](#obsidian-integration)
7. [Frontend Implementation](#frontend-implementation)
8. [Agent Intelligence Layer](#agent-intelligence-layer)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Known Issues & Future Improvements](#known-issues--future-improvements)

---

## 1. Executive Summary

This document outlines the technical design for a bi-directional Obsidian-integrated Kanban task management system. The system combines a modern HTML/JavaScript frontend with a Node.js API backend, providing seamless synchronization with Obsidian vault markdown files while offering intelligent task suggestions for AI agent automation.

### Key Features
- **Drag-and-drop Kanban board** (Today, Tonight, Backlog, Done)
- **Priority-based task management** (P0-P3 color-coded)
- **File attachment system** with auto-linking to agent outputs
- **Two-way Obsidian sync** via YAML frontmatter
- **AI suggestion engine** for "What should I work on next?"
- **Real-time event stream** for monitoring agent activity

---

## 2. System Architecture

### 2.1 Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (HTML/JS)                       │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Kanban Board   │  │ Event Stream │  │ Search/Filter  │ │
│  │  (SortableJS)   │  │   (30s poll) │  │   Interface    │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Task Details    │  │   File       │  │   Suggestion   │ │
│  │    Modal        │  │   Manager    │  │     Panel      │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API (HTTP/WS)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js API Server (Port 3001)                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Task Manager   │  │    Event     │  │     File       │ │
│  │   Controller    │  │   Logger     │  │   Controller   │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   Suggestion    │  │   Obsidian   │  │    Search      │ │
│  │     Engine      │  │  Sync Layer  │  │    Engine      │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │ File I/O
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  tasks.json     │  │  Obsidian MD │  │    Outputs     │ │
│  │  (localStorage) │  │   Files      │  │  (by date)     │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**Task Creation Flow:**
```
User Input → Frontend Validation → API POST /tasks 
→ Write to tasks.json → Sync to Obsidian MD 
→ Log event → Broadcast update → Frontend refresh
```

**Obsidian → Dashboard Sync Flow:**
```
User edits .md in Obsidian → File watcher detects change 
→ Parse YAML frontmatter → Update tasks.json 
→ Log event → Dashboard reflects changes on next poll
```

**File Attachment Flow:**
```
User drags file → Upload to API → Store in outputs/YYYY-MM-DD/ 
→ Create file record → Link to task → Update task in Obsidian 
→ Generate thumbnail (if image)
```

---

## 3. Data Models

### 3.1 Task Schema

```javascript
{
  "id": "string (UUID v4)",
  "title": "string (required, max 200 chars)",
  "description": "string (markdown, optional)",
  "priority": "enum (P0, P1, P2, P3) - default P2",
  "status": "enum (today, tonight, backlog, done)",
  "created": "ISO 8601 timestamp",
  "updated": "ISO 8601 timestamp",
  "completed": "ISO 8601 timestamp or null",
  "dueDate": "ISO 8601 date or null",
  "tags": ["array of strings"],
  "assignee": "string (for agent name) - default 'claw-machine'",
  "estimatedMinutes": "number or null",
  "actualMinutes": "number or null",
  "files": ["array of file IDs"],
  "obsidianPath": "string (relative path to .md) or null",
  "sourceContext": "string (conversation/mention source) or null",
  "backlinks": ["array of obsidian wiki links"],
  "metadata": {
    "createdBy": "enum (user, agent)",
    "suggestionScore": "number (0-100) or null",
    "lastSuggested": "ISO 8601 timestamp or null"
  }
}
```

### 3.2 Event Schema

```javascript
{
  "id": "string (UUID v4)",
  "timestamp": "ISO 8601 timestamp",
  "type": "enum (agent, task, subagent, system, reasoning)",
  "severity": "enum (info, warning, error, success)",
  "title": "string (required, max 100 chars)",
  "description": "string (optional, max 500 chars)",
  "metadata": {
    "taskId": "string (UUID) or null",
    "duration": "number (ms) or null",
    "model": "string (AI model name) or null",
    "source": "string (origin of event)"
  }
}
```

### 3.3 File Schema

```javascript
{
  "id": "string (UUID v4)",
  "filename": "string (original filename)",
  "filepath": "string (relative to outputs/)",
  "mimetype": "string (MIME type)",
  "size": "number (bytes)",
  "uploaded": "ISO 8601 timestamp",
  "taskIds": ["array of linked task UUIDs"],
  "thumbnail": "string (path to thumbnail) or null",
  "hash": "string (SHA-256 for deduplication)",
  "tags": ["array of strings"],
  "metadata": {
    "width": "number (for images) or null",
    "height": "number (for images) or null",
    "generatedBy": "string (agent/tool name) or null"
  }
}
```

---

## 4. API Specifications

### 4.1 Base Configuration

- **Protocol:** HTTP/1.1
- **Port:** 3001
- **Base URL:** `http://localhost:3001/api/v1`
- **Content-Type:** `application/json` (except file uploads)
- **Authentication:** None (local use only)

### 4.2 Task Endpoints

#### `GET /tasks`
Retrieve all tasks or filtered subset.

**Query Parameters:**
- `status` (optional): Filter by status (today, tonight, backlog, done)
- `priority` (optional): Filter by priority (P0-P3)
- `tags` (optional): Comma-separated tag list
- `search` (optional): Full-text search in title/description
- `limit` (optional): Max results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "tasks": [/* array of task objects */],
  "total": 42,
  "offset": 0,
  "limit": 100
}
```

#### `POST /tasks`
Create a new task.

**Request Body:**
```json
{
  "title": "Implement suggestion engine",
  "description": "Build AI-powered task recommendation system",
  "priority": "P1",
  "status": "today",
  "dueDate": "2026-02-05T00:00:00Z",
  "tags": ["development", "ai"],
  "sourceContext": "telegram:msg:12345"
}
```

**Response:** `201 Created` with full task object

#### `PATCH /tasks/:id`
Update an existing task (partial update).

**Request Body:** Any task fields to update

**Response:** `200 OK` with updated task object

#### `DELETE /tasks/:id`
Delete a task (moves to trash in Obsidian, sets deleted flag).

**Response:** `204 No Content`

#### `POST /tasks/:id/move`
Move task to different status column.

**Request Body:**
```json
{
  "status": "done"
}
```

**Response:** `200 OK` with updated task

#### `POST /tasks/:id/files`
Attach file to task.

**Request Body:**
```json
{
  "fileId": "uuid-of-uploaded-file"
}
```

**Response:** `200 OK` with updated task

### 4.3 Suggestion Endpoints

#### `GET /suggestions/next`
Get the next recommended task based on AI analysis.

**Query Parameters:**
- `context` (optional): Current context (e.g., "morning", "deep-work", "quick-wins")

**Response:**
```json
{
  "task": {/* full task object */},
  "score": 87,
  "reasoning": "High priority, due soon, blocks other tasks",
  "alternatives": [
    {
      "task": {/* task object */},
      "score": 72,
      "reasoning": "Quick win, high impact"
    }
  ]
}
```

#### `GET /suggestions/batch`
Get multiple task suggestions (top N).

**Query Parameters:**
- `count` (optional): Number of suggestions (default: 3, max: 10)
- `context` (optional): Context filter

**Response:**
```json
{
  "suggestions": [
    {
      "task": {/* task object */},
      "score": 87,
      "reasoning": "..."
    }
  ],
  "generated": "2026-02-03T20:30:00Z"
}
```

### 4.4 Event Endpoints

#### `GET /events`
Retrieve event stream.

**Query Parameters:**
- `since` (optional): ISO timestamp (return events after this time)
- `type` (optional): Filter by event type
- `limit` (optional): Max results (default: 50)

**Response:**
```json
{
  "events": [/* array of event objects */],
  "total": 150
}
```

#### `POST /events`
Log a new event.

**Request Body:**
```json
{
  "type": "agent",
  "severity": "info",
  "title": "Model switched to Claude",
  "description": "Activated extended thinking mode"
}
```

**Response:** `201 Created` with event object

### 4.5 File Endpoints

#### `POST /files/upload`
Upload a file.

**Request:** `multipart/form-data`
- `file`: File binary
- `taskId` (optional): Link to task immediately
- `tags` (optional): Comma-separated tags

**Response:** `201 Created`
```json
{
  "file": {/* full file object */},
  "url": "/api/v1/files/uuid/view"
}
```

#### `GET /files/:id/view`
Retrieve file binary.

**Response:** File binary with appropriate `Content-Type` header

#### `GET /files/:id/thumbnail`
Get thumbnail for images.

**Response:** Thumbnail image (JPEG, 200x200px)

#### `GET /files`
List files with optional filters.

**Query Parameters:**
- `taskId` (optional): Files linked to specific task
- `tags` (optional): Filter by tags
- `mimetype` (optional): Filter by MIME type pattern

**Response:**
```json
{
  "files": [/* array of file objects */],
  "total": 23
}
```

### 4.6 Search Endpoint

#### `GET /search`
Full-text search across tasks, events, and files.

**Query Parameters:**
- `q`: Search query (required)
- `scope` (optional): Comma-separated (tasks, events, files) - default: all
- `limit` (optional): Max results per scope (default: 10)

**Response:**
```json
{
  "results": {
    "tasks": [/* matching tasks */],
    "events": [/* matching events */],
    "files": [/* matching files */]
  },
  "query": "search term",
  "took": 23
}
```

### 4.7 Sync Endpoints

#### `POST /sync/obsidian/pull`
Pull changes from Obsidian vault to dashboard.

**Response:** `200 OK`
```json
{
  "synced": 5,
  "created": 2,
  "updated": 3,
  "deleted": 0
}
```

#### `POST /sync/obsidian/push`
Push changes from dashboard to Obsidian vault.

**Response:** `200 OK`
```json
{
  "synced": 7,
  "filesWritten": ["path/to/task1.md", "path/to/task2.md"]
}
```

#### `GET /sync/status`
Get sync status.

**Response:**
```json
{
  "lastPull": "2026-02-03T20:15:00Z",
  "lastPush": "2026-02-03T20:10:00Z",
  "pendingChanges": 2,
  "conflicts": []
}
```

---

## 5. File Management

### 5.1 Directory Structure

```
~/Desktop/Claw Creations/
├── agent-dashboard.html          # Main frontend
├── tasks.json                    # Primary task storage
├── files.json                    # File metadata index
├── outputs/                      # All generated files
│   ├── 2026-02-03/              # Daily folders
│   │   ├── screenshots/
│   │   ├── code/
│   │   ├── artifacts/
│   │   └── uploads/
│   ├── 2026-02-04/
│   └── projects/                # Project-specific folders
│       ├── kanban-system/
│       └── obsidian-sync/
└── thumbnails/                   # Generated thumbnails
    └── [file-id].jpg
```

### 5.2 File Organization Rules

1. **Daily Folders**: All outputs organized by ISO date (YYYY-MM-DD)
2. **Automatic Categorization**: Files auto-sorted by type:
   - `screenshots/`: PNG/JPG from screenshots
   - `code/`: Source code files (.js, .py, .md, etc.)
   - `artifacts/`: Generated documents, reports
   - `uploads/`: User-uploaded files
3. **Deduplication**: Files checked via SHA-256 hash before storage
4. **Thumbnail Generation**: Auto-generate 200x200px thumbnails for images
5. **Retention Policy**: Keep all files indefinitely (manual cleanup only)

### 5.3 Auto-Linking Strategy

When agent generates output:
1. **Detect Output**: Monitor agent commands that create files
2. **Store File**: Move/copy to appropriate outputs/ subdirectory
3. **Create Record**: Add entry to files.json with metadata
4. **Link to Context**: If task is active, auto-attach file to task
5. **Log Event**: Create event linking file creation to task/conversation

**Implementation Hook Points:**
- `exec` tool completions that generate files
- `write` tool calls in agent workflow
- Canvas/screenshot captures
- Browser download events

---

## 6. Obsidian Integration

### 6.1 Task File Format

Each task is represented as a markdown file in the Obsidian vault.

**File Path:** `~/Documents/Obsidian/Tasks/[status]/[task-id].md`

**Example File:**
```markdown
---
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
title: Implement suggestion engine
priority: P1
status: today
created: 2026-02-03T15:30:00Z
updated: 2026-02-03T18:45:00Z
dueDate: 2026-02-05
tags:
  - development
  - ai
assignee: claw-machine
estimatedMinutes: 120
files:
  - file-uuid-1
  - file-uuid-2
sourceContext: telegram:msg:12345
---

# Implement suggestion engine

## Description
Build AI-powered task recommendation system that analyzes:
- Task priority and due dates
- Historical completion patterns
- Current agent context

## Notes
- Use weighted scoring algorithm
- Consider time of day for suggestions
- Integrate with existing task metadata

## Backlinks
- [[Agent Intelligence Design]]
- [[Task Management Roadmap]]

## Attachments
![[outputs/2026-02-03/screenshots/suggestion-mockup.png]]
```

### 6.2 Sync Strategy

**Bi-Directional Sync Approach:**

1. **Dashboard → Obsidian (Push)**
   - Trigger: Task created/updated via dashboard
   - Action: Write/update markdown file in vault
   - Conflict: Dashboard wins (dashboard is source of truth for active changes)

2. **Obsidian → Dashboard (Pull)**
   - Trigger: File watcher detects .md change OR periodic poll (every 30s)
   - Action: Parse YAML, update tasks.json
   - Conflict: If `updated` timestamp in .md > tasks.json, Obsidian wins

3. **Conflict Resolution**
   - Compare `updated` timestamps
   - Most recent change wins
   - Log conflict events for manual review
   - Keep conflict versions as `.conflict-[timestamp].md`

### 6.3 DataviewJS Integration

**Example Dashboard Query:**
```javascript
// In Obsidian: Tasks Dashboard note
```dataviewjs
const tasks = dv.pages('"Tasks"')
  .where(t => t.status === "today" || t.status === "tonight")
  .sort(t => t.priority)
  .sort(t => t.dueDate);

dv.table(
  ["Task", "Priority", "Due", "Status"],
  tasks.map(t => [
    t.file.link,
    t.priority,
    t.dueDate,
    t.status
  ])
);
```
```

**Example Overdue Tasks:**
```javascript
```dataviewjs
const now = dv.date("now");
const overdue = dv.pages('"Tasks"')
  .where(t => t.dueDate && t.dueDate < now && t.status !== "done")
  .sort(t => t.priority);

if (overdue.length > 0) {
  dv.header(2, "⚠️ Overdue Tasks");
  dv.table(
    ["Task", "Priority", "Due Date", "Days Overdue"],
    overdue.map(t => [
      t.file.link,
      t.priority,
      t.dueDate,
      Math.floor((now - t.dueDate).days)
    ])
  );
}
```
```

### 6.4 File Watcher Implementation

```javascript
// Node.js server component
const chokidar = require('chokidar');
const path = require('path');

const OBSIDIAN_VAULT = path.join(
  process.env.HOME,
  'Documents/Obsidian/Tasks'
);

const watcher = chokidar.watch(
  `${OBSIDIAN_VAULT}/**/*.md`,
  {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  }
);

watcher
  .on('add', filepath => syncFileToTasks(filepath, 'create'))
  .on('change', filepath => syncFileToTasks(filepath, 'update'))
  .on('unlink', filepath => syncFileToTasks(filepath, 'delete'));
```

---

## 7. Frontend Implementation

### 7.1 Technology Stack

- **HTML5** with semantic markup
- **CSS3** with CSS Grid and Flexbox
- **Vanilla JavaScript** (ES6+)
- **SortableJS** for drag-and-drop (https://sortablejs.github.io/Sortable/)
- **Marked.js** for markdown rendering (https://marked.js.org/)
- **Day.js** for date manipulation (https://day.js.org/)

### 7.2 Core Components

#### Kanban Board
```html
<div id="kanban-board" class="kanban-container">
  <div class="kanban-column" data-status="today">
    <div class="column-header">
      <h2>Today</h2>
      <span class="task-count">3</span>
      <button class="add-task-btn" data-status="today">+</button>
    </div>
    <div class="task-list sortable" data-status="today">
      <!-- Task cards rendered here -->
    </div>
  </div>
  <!-- Repeat for tonight, backlog, done -->
</div>
```

#### Task Card
```html
<div class="task-card" data-task-id="uuid" data-priority="P1">
  <div class="task-header">
    <span class="priority-badge priority-p1">P1</span>
    <span class="task-due">Due: Feb 5</span>
  </div>
  <h3 class="task-title">Implement suggestion engine</h3>
  <p class="task-description">Build AI-powered task recommendation...</p>
  <div class="task-footer">
    <div class="task-tags">
      <span class="tag">development</span>
      <span class="tag">ai</span>
    </div>
    <div class="task-actions">
      <button class="icon-btn" title="Edit">✏️</button>
      <button class="icon-btn" title="Files">📎</button>
      <button class="icon-btn" title="Delete">🗑️</button>
    </div>
  </div>
  <div class="task-files" data-count="2">
    <span class="file-icon">📄</span> 2 files
  </div>
</div>
```

#### Suggestion Panel
```html
<div id="suggestion-panel" class="panel">
  <h2>🤖 What should I work on next?</h2>
  <div class="suggestion-card featured">
    <div class="suggestion-score">Score: 87</div>
    <h3 class="suggestion-title">Implement suggestion engine</h3>
    <p class="suggestion-reasoning">
      High priority, due soon, blocks other tasks
    </p>
    <button class="btn-primary">Start This Task</button>
  </div>
  <div class="suggestion-alternatives">
    <h4>Alternative suggestions:</h4>
    <!-- Additional suggestions -->
  </div>
  <button class="btn-secondary" onclick="refreshSuggestions()">
    Refresh Suggestions
  </button>
</div>
```

### 7.3 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | New task in current context |
| `F` | Focus search bar |
| `/` | Open command palette |
| `1-4` | Filter by priority (P0-P3) |
| `T` | Filter: Today tasks |
| `B` | Filter: Backlog tasks |
| `D` | Filter: Done tasks |
| `R` | Refresh suggestion |
| `Esc` | Close modal/clear filter |
| `Ctrl+S` | Force sync to Obsidian |
| `Ctrl+K` | Open task by ID |

**Implementation:**
```javascript
document.addEventListener('keydown', (e) => {
  // Ignore if typing in input field
  if (e.target.matches('input, textarea')) return;
  
  switch(e.key.toLowerCase()) {
    case 'n':
      openNewTaskModal();
      break;
    case 'f':
      document.getElementById('search-input').focus();
      break;
    case '/':
      openCommandPalette();
      break;
    // ... etc
  }
});
```

### 7.4 State Management

**localStorage Schema:**
```javascript
{
  "tasks": {/* tasks.json mirror */},
  "lastSync": "2026-02-03T20:30:00Z",
  "filters": {
    "status": null,
    "priority": null,
    "tags": [],
    "search": ""
  },
  "preferences": {
    "theme": "dark",
    "autoRefresh": true,
    "refreshInterval": 30000,
    "showCompleted": true
  }
}
```

**Update Flow:**
1. User action → Optimistic UI update
2. API call → Backend processing
3. On success: Confirm UI state
4. On error: Rollback + show error toast
5. Background poll: Sync with server state

### 7.5 Responsive Design

**Breakpoints:**
- Desktop: `>= 1024px` - 4-column layout
- Tablet: `768px - 1023px` - 2-column layout (Today/Tonight, Backlog/Done)
- Mobile: `< 768px` - Single column with tabs

---

## 8. Agent Intelligence Layer

### 8.1 Suggestion Algorithm

**Weighted Scoring Formula:**
```
score = (priorityWeight * priorityScore) +
        (urgencyWeight * urgencyScore) +
        (blockerWeight * blockerScore) +
        (contextWeight * contextScore) +
        (momentumWeight * momentumScore)
```

**Factor Definitions:**

1. **Priority Score (35% weight)**
   - P0: 100 points
   - P1: 75 points
   - P2: 50 points
   - P3: 25 points

2. **Urgency Score (25% weight)**
   - Overdue: 100 points
   - Due today: 80 points
   - Due tomorrow: 60 points
   - Due this week: 40 points
   - Due later: 20 points
   - No due date: 10 points

3. **Blocker Score (20% weight)**
   - Blocks 3+ tasks: 100 points
   - Blocks 2 tasks: 70 points
   - Blocks 1 task: 40 points
   - Blocks none: 0 points

4. **Context Score (10% weight)**
   - Matches current time of day (morning/afternoon/evening)
   - Matches estimated time available
   - Related to recently completed tasks (momentum)

5. **Momentum Score (10% weight)**
   - Same project as last completed task: +50 points
   - Same tags as recent activity: +30 points
   - Mentioned in recent conversations: +20 points

### 8.2 Auto-Population from Memory

**Source Detection:**

1. **Conversation Mentions**
   ```javascript
   // Scan agent memory files for action items
   const patterns = [
     /TODO: (.+)/gi,
     /need to (.+)/gi,
     /should (.+)/gi,
     /remind me to (.+)/gi,
     /\[ \] (.+)/gi  // Markdown checkbox
   ];
   ```

2. **Memory File Parsing**
   ```javascript
   // Parse memory/YYYY-MM-DD.md files
   function extractTasksFromMemory(memoryContent) {
     const tasks = [];
     const lines = memoryContent.split('\n');
     
     for (let line of lines) {
       for (let pattern of patterns) {
         const match = pattern.exec(line);
         if (match) {
           tasks.push({
             title: match[1].trim(),
             sourceContext: `memory:${date}:line:${lineNum}`,
             priority: detectPriority(line),
             status: 'backlog'
           });
         }
       }
     }
     
     return tasks;
   }
   ```

3. **Obsidian Backlink Analysis**
   - Scan vault for pages linking to agent/tasks
   - Extract incomplete task checkboxes
   - Create tasks with backlinks to source notes

### 8.3 Context-Aware Suggestions

**Time-of-Day Context:**
```javascript
function getTimeContext() {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    return {
      context: 'morning',
      energy: 'high',
      preferredTaskTypes: ['deep-work', 'creative', 'planning']
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      context: 'afternoon',
      energy: 'medium',
      preferredTaskTypes: ['meetings', 'communication', 'implementation']
    };
  } else if (hour >= 17 && hour < 22) {
    return {
      context: 'evening',
      energy: 'low',
      preferredTaskTypes: ['admin', 'quick-wins', 'review']
    };
  } else {
    return {
      context: 'night',
      energy: 'very-low',
      preferredTaskTypes: ['light', 'review', 'planning']
    };
  }
}
```

**Agent State Integration:**
```javascript
// Read agent state from session context
function getAgentContext() {
  return {
    thinkingMode: getCurrentThinkingMode(), // 'low', 'medium', 'high'
    model: getCurrentModel(), // Which AI model is active
    recentTasks: getRecentlyCompletedTasks(5),
    activeProject: detectActiveProject(),
    availableTime: estimateAvailableTime() // Based on calendar/schedule
  };
}
```

### 8.4 Automation Hooks

**Agent Command Integration:**
```javascript
// Example: Agent creates task via natural language
// "Remind me to review the technical plan tomorrow"

async function parseNaturalLanguageTask(input) {
  const task = {
    title: extractTitle(input),
    dueDate: extractDate(input), // "tomorrow" → ISO date
    priority: extractPriority(input) || 'P2',
    status: determinStatus(input) || 'backlog',
    sourceContext: `agent:command:${timestamp}`,
    metadata: {
      createdBy: 'agent'
    }
  };
  
  return await createTask(task);
}
```

**Scheduled Task Generation:**
```javascript
// Cron job: Generate daily planning tasks
cron.schedule('0 6 * * *', async () => {
  const suggestion = await getSuggestion('morning');
  
  await createTask({
    title: 'Daily Planning: Review Today\'s Tasks',
    description: `Top suggestion: ${suggestion.task.title}`,
    priority: 'P1',
    status: 'today',
    dueDate: new Date().toISOString(),
    metadata: {
      createdBy: 'agent',
      auto: true
    }
  });
});
```

---

## 9. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
**Goal:** Basic functional dashboard with manual task management

**Tasks:**
- [ ] Set up Node.js API server structure
- [ ] Implement task CRUD endpoints
- [ ] Create tasks.json storage layer
- [ ] Build basic HTML/CSS dashboard layout
- [ ] Implement drag-and-drop with SortableJS
- [ ] Add priority color coding
- [ ] Create task creation modal
- [ ] Implement localStorage caching
- [ ] Add basic event logging

**Deliverables:**
- Working dashboard at `~/Desktop/Claw Creations/agent-dashboard.html`
- API server running on port 3001
- Task creation, editing, moving, deletion functional

---

### Phase 2: File Management (Week 2)
**Goal:** Attach files to tasks with auto-linking

**Tasks:**
- [ ] Implement file upload endpoint
- [ ] Create outputs/ directory structure
- [ ] Build file deduplication (SHA-256)
- [ ] Add thumbnail generation for images
- [ ] Create file attachment UI
- [ ] Implement drag-and-drop file upload
- [ ] Build file preview modal
- [ ] Add auto-linking hooks to agent workflow
- [ ] Create file metadata index (files.json)

**Deliverables:**
- File upload and attachment working
- Auto-linking from agent outputs
- Thumbnail previews in task cards

---

### Phase 3: Obsidian Integration (Week 3)
**Goal:** Bi-directional sync with Obsidian vault

**Tasks:**
- [ ] Implement YAML frontmatter parser
- [ ] Create markdown file generator for tasks
- [ ] Set up file watcher (chokidar)
- [ ] Build sync push/pull endpoints
- [ ] Implement conflict resolution logic
- [ ] Create sync status dashboard
- [ ] Add backlink extraction
- [ ] Test with Obsidian DataviewJS
- [ ] Document Obsidian template usage

**Deliverables:**
- Tasks sync between dashboard and Obsidian
- File watcher detects manual Obsidian edits
- Conflict resolution working
- DataviewJS queries functional

---

### Phase 4: Intelligence Layer (Week 4)
**Goal:** AI-powered task suggestions

**Tasks:**
- [ ] Implement suggestion scoring algorithm
- [ ] Build context detection (time of day, agent state)
- [ ] Create memory file parser
- [ ] Add conversation mention extraction
- [ ] Build suggestion API endpoints
- [ ] Create suggestion panel UI
- [ ] Add "Start This Task" quick action
- [ ] Implement suggestion refresh logic
- [ ] Test with various contexts

**Deliverables:**
- "What should I work on next?" functional
- Suggestions reflect priority, urgency, context
- Auto-population from memory files working

---

### Phase 5: Polish & Features (Week 5)
**Goal:** Advanced features and UX improvements

**Tasks:**
- [ ] Implement full-text search
- [ ] Add keyboard shortcuts
- [ ] Build task filtering/sorting UI
- [ ] Create command palette
- [ ] Add undo/redo functionality
- [ ] Implement bulk operations
- [ ] Add task dependencies/blockers
- [ ] Create dark mode theme
- [ ] Build mobile-responsive layout
- [ ] Add WebSocket for real-time updates

**Deliverables:**
- Polished, production-ready dashboard
- All keyboard shortcuts working
- Mobile-friendly responsive design
- Real-time updates without polling

---

### Phase 6: Automation & Integration (Week 6)
**Goal:** Deep agent integration and automation

**Tasks:**
- [ ] Add natural language task parsing
- [ ] Create scheduled task generation (cron)
- [ ] Build agent heartbeat integration
- [ ] Implement task completion notifications
- [ ] Add Telegram bot integration (optional)
- [ ] Create task templates
- [ ] Build recurring task support
- [ ] Add time tracking features
- [ ] Create analytics dashboard
- [ ] Document automation workflows

**Deliverables:**
- Agent can create tasks via natural language
- Scheduled reminders and planning tasks
- Analytics on task completion patterns
- Full automation documentation

---

## 10. Known Issues & Future Improvements

### 10.1 Current Limitations

1. **No Multi-User Support**
   - System designed for single agent/user
   - No authentication or permissions
   - Solution: Add user model + JWT auth in future version

2. **File Deduplication**
   - SHA-256 hashing works but doesn't handle similar files
   - No perceptual hashing for images
   - Solution: Integrate pHash library for image similarity

3. **Sync Conflicts**
   - Timestamp-based conflict resolution is naive
   - No three-way merge for complex conflicts
   - Solution: Implement operational transformation (OT) or CRDT

4. **No Real-Time Collaboration**
   - Polling-based updates (30s delay)
   - If two clients edit simultaneously, last write wins
   - Solution: Add WebSocket broadcasting

5. **Limited Search**
   - Simple substring matching only
   - No fuzzy search or relevance ranking
   - Solution: Integrate Fuse.js or MiniSearch library

6. **Performance at Scale**
   - No pagination in UI (loads all tasks)
   - JSON file storage not optimized for >1000 tasks
   - Solution: Migrate to SQLite or MongoDB

### 10.2 Future Enhancements

**Short-Term (Next 3 Months):**
- [ ] Task templates (e.g., "Code Review", "Bug Fix")
- [ ] Recurring tasks (daily, weekly, monthly)
- [ ] Task dependencies with visual graph
- [ ] Pomodoro timer integration
- [ ] Browser extension for quick task capture
- [ ] Voice input for task creation (whisper.cpp)

**Medium-Term (6 Months):**
- [ ] Calendar view (day/week/month)
- [ ] Gantt chart for project planning
- [ ] Team collaboration mode (multi-user)
- [ ] Advanced analytics dashboard (velocity, burn-down)
- [ ] Integration with GitHub issues
- [ ] Email-to-task forwarding
- [ ] Mobile app (React Native)

**Long-Term (12 Months):**
- [ ] AI-powered task breakdown (decompose complex tasks)
- [ ] Predictive completion time estimates
- [ ] Automatic task prioritization (ML model)
- [ ] Natural language query interface ("Show me all overdue P0 tasks")
- [ ] Integration with other productivity tools (Notion, Todoist)
- [ ] Custom workflow automation (Zapier-style)
- [ ] Public API for third-party integrations

### 10.3 Technical Debt

1. **Error Handling**
   - Current implementation has minimal error handling
   - Need comprehensive try/catch blocks
   - Add error logging to file

2. **Testing**
   - No automated tests currently
   - Need unit tests for API endpoints
   - Need integration tests for sync logic
   - Add E2E tests for critical workflows

3. **Documentation**
   - API documentation should be generated (JSDoc + Swagger)
   - Need user guide with screenshots
   - Add developer setup guide

4. **Code Organization**
   - Frontend JS should be modularized (separate files)
   - Backend needs service layer architecture
   - Extract suggestion engine to separate module

5. **Configuration**
   - Hard-coded paths should move to config file
   - Need environment variables for customization
   - Add CLI for setup/configuration

### 10.4 Security Considerations

**Current Risk Assessment:**
- **Low Risk:** Local-only deployment (localhost:3001)
- **No Authentication:** Acceptable for single-user agent
- **File Access:** Agent has full filesystem access (by design)

**If Exposing Publicly:**
- [ ] Add JWT authentication
- [ ] Implement HTTPS/TLS
- [ ] Add rate limiting
- [ ] Sanitize all user inputs (XSS prevention)
- [ ] Validate file uploads (virus scanning)
- [ ] Add CORS restrictions
- [ ] Implement audit logging

### 10.5 Backup & Recovery

**Current State:**
- No automated backups
- Data in `tasks.json` and Obsidian vault
- Obsidian vault may be synced via iCloud/Obsidian Sync

**Recommended Approach:**
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR=~/Desktop/Claw\ Creations/backups
DATE=$(date +%Y-%m-%d)

mkdir -p "$BACKUP_DIR/$DATE"
cp ~/Desktop/Claw\ Creations/tasks.json "$BACKUP_DIR/$DATE/"
cp ~/Desktop/Claw\ Creations/files.json "$BACKUP_DIR/$DATE/"
cp -r ~/Desktop/Claw\ Creations/outputs "$BACKUP_DIR/$DATE/"

# Keep only last 30 days
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} \;
```

Add to crontab:
```
0 2 * * * /path/to/backup-script.sh
```

---

## Appendix A: Example API Usage

### Creating a Task via cURL
```bash
curl -X POST http://localhost:3001/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review technical plan",
    "priority": "P1",
    "status": "today",
    "dueDate": "2026-02-04T17:00:00Z",
    "description": "Review and provide feedback on Kanban system design"
  }'
```

### Getting Next Suggestion
```bash
curl http://localhost:3001/api/v1/suggestions/next?context=morning
```

### Uploading a File
```bash
curl -X POST http://localhost:3001/api/v1/files/upload \
  -F "file=@screenshot.png" \
  -F "taskId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -F "tags=screenshot,design"
```

---

## Appendix B: Obsidian Template

Save this as `~/Documents/Obsidian/Templates/Task Template.md`:

```markdown
---
id: {{UUID}}
title: "{{TITLE}}"
priority: P2
status: backlog
created: {{DATE}}
updated: {{DATE}}
dueDate: 
tags:
  - 
assignee: claw-machine
estimatedMinutes: 
files: []
sourceContext: 
---

# {{TITLE}}

## Description


## Notes


## Backlinks


## Attachments

```

---

## Appendix C: Package.json for API Server

```json
{
  "name": "kanban-api-server",
  "version": "1.0.0",
  "description": "API server for Obsidian-integrated Kanban system",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "chokidar": "^3.5.3",
    "gray-matter": "^4.0.3",
    "uuid": "^9.0.0",
    "sharp": "^0.32.0",
    "ws": "^8.13.0",
    "node-cron": "^3.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.5.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | Claw Machine Agent | Initial technical design document |

---

**END OF DOCUMENT**
