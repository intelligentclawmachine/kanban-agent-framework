# Kanban Agent Execution Framework
## Application Overview & Tech Stack

---

## Purpose

The **Kanban Agent Execution Framework** is an AI-powered task management system that bridges traditional kanban-style project management with autonomous agent execution. It allows users to:

1. **Create and manage tasks** using a Trello-style kanban board
2. **Auto-generate execution plans** via AI planning agents
3. **Execute tasks autonomously** through specialized AI sub-agents
4. **Track progress and costs** in real-time
5. **Archive completed work** with full execution reports

### Key Value Propositions

- **Automated Planning:** AI generates step-by-step execution plans for any task
- **Autonomous Execution:** Tasks execute without human intervention using specialized agents
- **Cost Tracking:** Real-time visibility into token usage and execution costs
- **Persistent Storage:** All plans, outputs, and history stored locally
- **Extensible Agent System:** Support for multiple agent types (coder, UI designer, researcher, etc.)

---

## Core Workflows

### 1. Task Creation → Planning → Execution

```
User creates task → AI generates plan → User approves → AI executes steps → Task complete
```

### 2. Direct Execution (No Planning)

```
User creates task → AI executes immediately → Task complete
```

### 3. Archive & Recovery

```
Completed task → Execution report generated → Task archived → Can restore to backlog
```

---

## Tech Stack

### Backend

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Node.js (v25.5.0) | Server runtime |
| **Framework** | Express.js | HTTP API server |
| **WebSocket** | ws | Real-time client updates |
| **File Watching** | chokidar | Obsidian vault sync (disabled) |
| **Scheduling** | node-cron | Cron job support |
| **Frontmatter** | gray-matter | Markdown metadata parsing |

### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Structure** | Vanilla HTML5 | Single-page application |
| **Styling** | CSS Variables | Dark theme, responsive design |
| **Drag & Drop** | SortableJS | Kanban card reordering |
| **Icons** | Emoji | Native system emoji |
| **Real-time** | WebSocket Client | Live updates from server |

### AI/Agent Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Agent Spawning** | OpenClaw CLI | Spawn sub-agents via `openclaw agent --local` |
| **Default Model** | Kimi K2.5 (Moonshot) | Cost-effective, capable model |
| **Model Router** | OpenRouter | Unified API for multiple providers |
| **Alternative Models** | Codex 5.2, Claude Sonnet/Opus, Gemini | Specialized agent types |

### Storage

| Component | Format | Location |
|-----------|--------|----------|
| **Tasks** | JSON | `~/Desktop/Claw Creations/tasks.json` |
| **Files** | JSON | `~/Desktop/Claw Creations/files.json` |
| **Events** | JSON | `~/Desktop/Claw Creations/events.json` |
| **Reports** | JSON | `~/Desktop/Claw Creations/reports.json` |
| **Archive** | JSON | `~/Desktop/Claw Creations/archive.json` |
| **Plans** | Markdown + YAML | `~/.openclaw/workspace/plans/` |
| **Outputs** | Mixed | `~/Desktop/Claw Creations/outputs/` |

### Configuration

| Component | Location | Purpose |
|-----------|----------|---------|
| **OpenClaw Config** | `~/.openclaw/openclaw.json` | Gateway, channels, models |
| **Agent Workspace** | `~/.openclaw/workspace/` | AGENTS.md, SOUL.md, MEMORY.md |
| **Obsidian Vault** | `~/Documents/Obsidian/` | Task markdown files (manual sync) |

---

## Architecture

### Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Server                        │
│                      Port 3001                               │
├─────────────────────────────────────────────────────────────┤
│  HTTP API Layer          │   WebSocket Layer               │
│  ├─ GET  /tasks          │   ├─ Connection management      │
│  ├─ POST /tasks          │   ├─ Broadcast updates          │
│  ├─ PUT  /tasks/:id      │   └─ Real-time notifications    │
│  ├─ POST /plans/:id/...  │                                  │
│  └─ ...                  │                                  │
├─────────────────────────────────────────────────────────────┤
│  Core Services                                              │
│  ├─ Task Manager         (tasks.json)                       │
│  ├─ Plan Storage         (plans/active/)                    │
│  ├─ Session Tracker      (activeSessions Map)               │
│  ├─ Agent Spawner        (agent-spawner.js)                 │
│  └─ Event Logger         (events.json)                      │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                      │
│  ├─ OpenClaw CLI         (sub-agent spawning)               │
│  ├─ OpenRouter API       (model access)                     │
│  └─ Obsidian             (markdown sync - disabled)         │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  agent-dashboard.html                        │
├─────────────────────────────────────────────────────────────┤
│  Header                                                  │
│  ├─ Title + Search                                       │
│  ├─ Active Sessions (horizontal scroll)                  │
│  └─ Create Task Button                                   │
├─────────────────────────────────────────────────────────────┤
│  Kanban Board                                            │
│  ├─ Today      │  Tonight    │  Backlog    │  Done       │
│  │  [Tasks...] │  [Tasks...] │  [Tasks...] │  [Tasks...] │
│  │             │             │             │             │
│  └─ SortableJS drag-and-drop                             │
├─────────────────────────────────────────────────────────────┤
│  Right Panel (collapsible)                               │
│  ├─ Past Sessions                                        │
│  ├─ Reports                                              │
│  └─ Archive                                              │
├─────────────────────────────────────────────────────────────┤
│  Modals                                                  │
│  ├─ Task Modal        (create/edit)                      │
│  ├─ Plan Review Modal (approve/reject)                   │
│  ├─ Report Modal      (execution details)                │
│  └─ Session View      (step-by-step progress)            │
└─────────────────────────────────────────────────────────────┘
```

### Agent Execution Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│  User    │───→│   Server     │───→│   Planning   │───→│   Plan   │
│  Task    │    │   Endpoint   │    │    Agent     │    │  Created │
└──────────┘    └──────────────┘    └──────────────┘    └────┬─────┘
                                                             │
                                    ┌────────────────────────┘
                                    │
                                    ▼
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│  Task    │←───│   Server     │←───│  Execution   │←───│  Auto-   │
│ Complete │    │   Complete   │    │    Agent     │    │  Execute │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘
```

---

## API Endpoints

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tasks` | List all tasks |
| POST | `/api/v1/tasks` | Create new task |
| PUT | `/api/v1/tasks/:id` | Update task |
| DELETE | `/api/v1/tasks/:id` | Delete task |
| POST | `/api/v1/tasks/:id/move` | Move to column |

### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/plans/:id/planning` | Start planning phase |
| POST | `/api/v1/plans/:id/execute` | Execute approved plan |
| PUT | `/api/v1/plans/:id/approve` | Approve plan |
| GET | `/api/v1/plans/:id` | Get plan details |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/sessions/active` | List active sessions |
| GET | `/api/v1/sessions/history` | List past sessions |
| POST | `/api/v1/sessions/:id/kill` | Terminate session |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports` | List execution reports |
| GET | `/api/v1/reports/:id` | Get report details |

---

## Agent Types

| Type | Model | Best For |
|------|-------|----------|
| `auto` | Kimi K2.5 | General tasks |
| `coder` | GPT-5.2 Codex | Code generation |
| `ui-designer` | Claude Sonnet 4.5 | UI/UX design |
| `researcher` | Kimi K2.5 | Information gathering |
| `writer` | Claude Sonnet 4.5 | Content creation |
| `planner` | Claude Opus 4.5 | Complex planning |

---

## Key Files

### Server
- `server.js` - Main API server (~4400 lines)
- `agent-spawner.js` - Agent execution module

### Frontend
- `agent-dashboard.html` - Single-page application (~4700 lines)

### Configuration
- `~/.openclaw/openclaw.json` - OpenClaw gateway config
- `~/.openclaw/workspace/` - Agent workspace with memory files

### Data
- `tasks.json` - Kanban tasks
- `plans/active/` - Active execution plans
- `outputs/` - Generated files from agents

---

## Development Notes

### Model Selection Strategy
- **Default:** Kimi K2.5 (cost-effective, 256K context)
- **Coding:** GPT-5.2 Codex (specialized for code)
- **Complex reasoning:** Claude Opus 4.5 (highest capability)
- **Balanced:** Claude Sonnet 4.5 (good for UI/writing)

### Cost Estimates
- Simple task: ~$0.001-0.003
- Medium task: ~$0.01-0.05
- Complex task: ~$0.05-0.20

### Timeout Configuration
- Planning phase: 5 minutes
- Execution per step: 5 minutes
- Total task timeout: 30 minutes

---

## Future Enhancements

1. **Persistent Job Queue** - Survive server restarts
2. **State Reconciliation** - Auto-recover from crashes
3. **Agent Profiles** - Custom agent configurations
4. **Cost Dashboard** - Detailed spending analytics
5. **Git Integration** - Auto-commit agent outputs
6. **Multi-User Support** - Team collaboration

---

*Document Version: 1.0*  
*Last Updated: 2026-02-05*
