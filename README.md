# Kanban Agent Framework

A full-stack Kanban task management system with AI agent execution capabilities. Built with Express.js backend and React frontend.

## Project Structure

```
.
├── server.js                    # Main Express server (API + WebSocket)
├── agent-spawner.js             # Agent execution module
├── package.json                 # Server dependencies
├── start.sh                     # Startup script
│
├── kanban-agent-ui/             # React frontend application
│   ├── src/                     # React source code
│   ├── dist/                    # Production build
│   └── package.json             # Frontend dependencies
│
├── agent-dashboard.html         # Legacy HTML dashboard (fallback)
│
├── outputs/                     # Generated output files (gitignored)
├── thumbnails/                  # File thumbnails (gitignored)
│
├── legacy/                      # Archived files and planning docs
│
└── Data files (runtime):
    ├── tasks.json               # Task data
    ├── events.json              # Event log
    ├── reports.json             # Execution reports
    ├── archive.json             # Archived tasks
    ├── active-sessions.json     # Running agent sessions
    ├── past-sessions.json       # Completed sessions
    ├── execution-queue.json     # Pending executions
    └── files.json               # File attachments
```

## Quick Start

### 1. Install Dependencies

```bash
# Server dependencies
npm install

# Frontend dependencies
cd kanban-agent-ui
npm install
```

### 2. Build Frontend (Production)

```bash
cd kanban-agent-ui
npm run build
```

### 3. Start Server

```bash
# From root directory
node server.js
# Or use the start script
./start.sh
```

### 4. Access Application

- **React UI**: http://localhost:3001 (when built)
- **Legacy UI**: http://localhost:3001/legacy
- **API**: http://localhost:3001/api/v1
- **WebSocket**: ws://localhost:3001

## Development Mode

For frontend development with hot reload:

```bash
# Terminal 1: Start API server
node server.js

# Terminal 2: Start Vite dev server
cd kanban-agent-ui
npm run dev
# Access at http://localhost:3000
```

## Tech Stack

### Backend
- Express.js
- WebSocket (ws)
- Node.js file system APIs
- Gray-matter (frontmatter parsing)

### Frontend
- React 18
- Vite (build tool)
- React Query (server state)
- Zustand (client state)
- @dnd-kit (drag and drop)
- Axios (HTTP client)

## API Endpoints

### Tasks
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `PATCH /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task
- `POST /api/v1/tasks/:id/move` - Move task between columns

### Plans
- `GET /api/v1/plans/:taskId` - Get plan
- `POST /api/v1/plans/:taskId/planning` - Start planning
- `PUT /api/v1/plans/:taskId/approve` - Approve plan
- `POST /api/v1/plans/:taskId/execute` - Execute plan

### Sessions
- `GET /api/v1/sessions/active` - Active sessions
- `GET /api/v1/sessions/history` - Session history
- `POST /api/v1/sessions/:id/kill` - Stop session

### Other
- `GET /api/v1/events` - Event stream
- `GET /api/v1/reports` - Execution reports
- `GET /api/v1/archive` - Archived tasks

## Features

- Kanban board with Today/Tomorrow/Backlog columns
- Drag-and-drop task management
- AI agent planning and execution
- Real-time updates via WebSocket
- Plan review and approval workflow
- Session monitoring and control
- Execution reports and history
- File attachments

## License

MIT
