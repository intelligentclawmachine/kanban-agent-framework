# Kanban Agent Execution Framework
## Production Implementation Plan

**Document Version:** 1.0  
**Date:** 2026-02-04  
**Status:** Planning Phase - Pending Review  

---

## Executive Summary

This document outlines the complete production implementation plan for the Kanban Agent Execution Framework. The current implementation contains significant simulation/fake code that must be replaced with real agent execution via OpenRouter API calls.

**Current State:** Simulation-based (non-functional for real tasks)  
**Target State:** Production-ready with real AI agent execution  
**Estimated Implementation Time:** 4-6 hours  
**Critical Path:** Agent execution module → Planning phase → Execution phase

---

## 1. Product Overview

### 1.1 Purpose
A Kanban-style task management system with integrated AI agent execution. Users create tasks, agents execute them, and results are tracked with full visibility.

### 1.2 Core Workflow
```
User Creates Task → Planning Agent (optional) → Execution Agent → Task Complete
     ↓                                              ↓
Kanban Board                                  Report Generated
```

### 1.3 Key Features
- **Task Management:** Backlog, Today, Tomorrow columns
- **Agent Assignment:** Auto or manual agent type selection
- **Planning Phase:** Optional multi-step plan generation
- **Execution:** Real-time execution monitoring
- **Reporting:** Completion reports with prompts, outputs, costs
- **Archive:** Completed task storage and retrieval

---

## 2. Technology Stack

### 2.1 Backend
- **Runtime:** Node.js v25.5.0
- **Framework:** Express.js 4.x
- **Storage:** JSON files (tasks.json, reports.json, archive.json)
- **Plan Storage:** Markdown files in ~/.openclaw/workspace/plans/
- **WebSocket:** ws library for real-time updates
- **File Upload:** multer
- **Process Management:** child_process.spawn

### 2.2 Frontend
- **HTML:** Single-page application
- **Styling:** CSS with CSS variables (dark theme)
- **JavaScript:** Vanilla JS (no framework)
- **Drag & Drop:** SortableJS
- **Real-time:** WebSocket client

### 2.3 AI/Agent Layer
- **API:** OpenRouter (openrouter.ai)
- **Model:** Kimi K2.5 (openrouter/moonshotai/kimi-k2.5)
- **Execution Method:** sessions_spawn via OpenClaw CLI
- **Timeout:** 5 minutes per step, 30 minutes per task

### 2.4 Infrastructure
- **Server:** localhost:3001
- **WebSocket:** ws://localhost:3001
- **Output Directory:** ~/Desktop/Claw Creations/outputs/
- **Plan Directory:** ~/.openclaw/workspace/plans/

---

## 3. Current Issues (Critical)

### 3.1 Simulation Code (CRITICAL - BREAKS ALL FUNCTIONALITY)

#### Issue: Fake Planning Phase
**Location:** server.js ~lines 4487-4630  
**Problem:** Creates hardcoded 4-step to-do list plan regardless of actual task
```javascript
// CURRENT (BROKEN):
const planContent = `---
taskId: ${taskId}
stepCount: 4
...
### Step 1: Create HTML structure  // ALWAYS THE SAME
Create the basic HTML file with:
- Input field for new tasks  // NEVER CHANGES
...
`;
```
**Impact:** All tasks get identical plans, no actual planning occurs

#### Issue: spawnSubAgent Simulation
**Location:** server.js ~lines 3300-3950  
**Problem:** Function simulates agent work instead of calling real agent
```javascript
// CURRENT (BROKEN):
async function spawnSubAgent(...) {
  // Simulate agent work time (FAKE)
  await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
  
  // Pattern matching instead of understanding (BROKEN)
  const isGitHubTask = title.includes('github');
  const isCalculatorTask = title.includes('calculator');
  
  if (isGitHubTask) {
    // Hardcoded fake GitHub response
    output = `STEP_COMPLETE
Result: Created GitHub repository...
Files Created: 
URLs: https://github.com/intelligentclawmachine/${repoName}`;
  }
  // ... more hardcoded branches
}
```
**Impact:** No real AI execution, just pattern matching and template responses

#### Issue: Generic Fallback Response
**Location:** server.js ~line 3899  
**Problem:** Default response for unmatched tasks
```javascript
// CURRENT (BROKEN):
output = `STEP_COMPLETE
Result: Completed step ${stepNumber} successfully. ${stepNumber === 1 ? 'Created HTML structure' : stepNumber === 2 ? 'Added CSS styling' : 'Implemented functionality'} as specified in the task plan.
Files Created: 
URLs: 
Notes: Step completed. Ready for next phase.`;
```
**Impact:** Tasks like "Climb Empire State Building" return "Created HTML structure"

### 3.2 Code Structure Issues

#### Issue: Mixed Async/Await
**Problem:** `await` inside non-async block after partial edits  
**Impact:** Syntax errors prevent server startup

#### Issue: Dead Code Blocks
**Problem:** Large blocks of old simulation code (1000+ lines) still present  
**Impact:** File bloat, maintenance difficulty

#### Issue: Missing Agent Integration
**Problem:** No actual call to OpenRouter API or sessions_spawn  
**Impact:** Zero real AI functionality

### 3.3 Frontend Issues

#### Issue: DOM Element References
**Problem:** JavaScript references removed DOM elements (session-list, etc.)  
**Impact:** Console errors, broken UI updates

#### Issue: Session State Mismatch
**Problem:** Task shows "executing" but no active session exists  
**Impact:** User confusion about task status

---

## 4. Required Changes

### 4.1 Phase 1: Agent Execution Module (PRIORITY: CRITICAL)

**File:** agent-spawner.js  
**Purpose:** Real agent execution via OpenRouter

**Implementation:**
```javascript
async function spawnAgentWithResult({ task, outputPath, model, timeoutSeconds, agentType }) {
  // Call OpenClaw sessions_spawn
  // Wait for completion
  // Parse output
  // Return structured result
}
```

**Key Requirements:**
- [ ] Spawn agent via OpenClaw CLI
- [ ] Capture stdout/stderr
- [ ] Parse STEP_COMPLETE format
- [ ] Handle timeouts (5 min default)
- [ ] Report errors properly
- [ ] Calculate token usage

### 4.2 Phase 2: Replace Planning Phase (PRIORITY: CRITICAL)

**File:** server.js  
**Location:** /api/v1/plans/:taskId/planning handler

**Current (BROKEN):**
```javascript
const planContent = `---
taskId: ${taskId}
stepCount: 4  // HARDCODED
...
### Step 1: Create HTML structure  // ALWAYS SAME
`;
await writePlan(taskId, planContent);
```

**Required (PRODUCTION):**
```javascript
const planningPrompt = `Create execution plan for: ${task.title}
Description: ${task.description}
Save to: ${planOutputPath}`;

const result = await spawnAgentWithResult({
  task: planningPrompt,
  outputPath: planOutputPath,
  model: 'openrouter/moonshotai/kimi-k2.5',
  timeoutSeconds: 300
});

if (!result.success) throw new Error('Planning failed');
```

### 4.3 Phase 3: Replace Execution Phase (PRIORITY: CRITICAL)

**File:** server.js  
**Function:** spawnSubAgent (completely rewrite)

**Current (BROKEN):**
```javascript
async function spawnSubAgent(execId, prompt, taskId, stepNumber, agentType) {
  await new Promise(resolve => setTimeout(resolve, 3000)); // FAKE DELAY
  
  if (title.includes('github')) { // PATTERN MATCHING
    return fakeGitHubResponse;
  }
  // ... more hardcoded branches
}
```

**Required (PRODUCTION):**
```javascript
async function spawnSubAgent(execId, prompt, taskId, stepNumber, agentType) {
  const outputPath = path.join(CONFIG.OUTPUTS_DIR, `step-${stepNumber}-output-${Date.now()}.txt`);
  
  const result = await spawnAgentWithResult({
    task: prompt,
    outputPath: outputPath,
    model: 'openrouter/moonshotai/kimi-k2.5',
    timeoutSeconds: 300,
    agentType: agentType
  });
  
  return {
    output: result.output,
    files: result.files,
    urls: result.urls,
    model: result.model,
    tokensUsed: result.tokensUsed
  };
}
```

### 4.4 Phase 4: Remove Dead Code (PRIORITY: HIGH)

**Actions:**
- [ ] Remove all hardcoded HTML templates (calculator, todo, etc.)
- [ ] Remove pattern matching logic (isGitHubTask, isCalculatorTask, etc.)
- [ ] Remove `await new Promise(...)` simulation delays
- [ ] Remove generic "STEP_COMPLETE" fallback
- [ ] Clean up if(false) blocks

**Lines to Remove:** Approximately 1000 lines of dead code

### 4.5 Phase 5: Frontend Fixes (PRIORITY: MEDIUM)

**Actions:**
- [ ] Add null checks for DOM elements
- [ ] Fix renderSessions() to only update horizontal bar
- [ ] Fix renderSessionHistory() to only update horizontal bar
- [ ] Remove references to deleted session-list element

### 4.6 Phase 6: Error Handling (PRIORITY: HIGH)

**Actions:**
- [ ] Add try/catch around all agent calls
- [ ] Update task status to 'error' on failure
- [ ] Show error messages in UI
- [ ] Log errors to event log
- [ ] Don't mark tasks complete on failure

---

## 5. Files Created During Partial Implementation

### 5.1 New Files
| File | Purpose | Status |
|------|---------|--------|
| agent-spawner.js | Real agent execution module | Created, needs integration |
| IMPLEMENTATION_PLAN.md | This document | Complete |

### 5.2 Modified Files
| File | Changes | Status |
|------|---------|--------|
| server.js | Partial edits for real agents | Corrupted, needs restoration |

### 5.3 Backup Files
| File | Purpose |
|------|---------|
| server.js.backup.1770265554 | Pre-corruption backup |

---

## 6. Implementation Approach

### 6.1 Recommended Strategy: Clean Slate

Given the extent of simulation code and current corruption:

1. **Restore** from backup (server.js.backup.1770265554)
2. **Create** agent-spawner.js (already done)
3. **Surgically modify** only these 3 locations:
   - Planning handler (POST /plans/:taskId/planning)
   - executeStepWithAgent function
   - spawnSubAgent function (complete rewrite)
4. **Remove** ~100 lines of pattern matching code
5. **Test** with single task

### 6.2 Alternative: Full Rewrite

If surgical approach fails:
1. Create new server-production.js
2. Copy only working code paths
3. Implement clean agent execution
4. Replace server.js when complete

---

## 7. Testing Plan

### 7.1 Unit Tests
- [ ] Agent spawner can spawn Kimi K2.5
- [ ] Agent spawner handles timeout
- [ ] Agent spawner parses output correctly

### 7.2 Integration Tests
- [ ] Create task → Plan generated by real agent
- [ ] Start task → Real agent executes
- [ ] Task with file output → File actually created
- [ ] Task with URL → URL actually accessible
- [ ] Error case → Task marked error, not complete

### 7.3 Real-World Tests
- [ ] "Create a simple to-do list" → Working HTML file
- [ ] "Create calculator" → Working calculator
- [ ] "Write a blog post about AI" → Actual text content
- [ ] "Create GitHub repo" → Repo actually created

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Agent timeout on complex tasks | High | Medium | Implement step-level timeouts |
| OpenRouter API rate limits | Medium | High | Add rate limiting, retry logic |
| Large output files | Medium | Medium | Implement streaming/chunking |
| Server crashes during execution | Low | High | Add process monitoring |
| Cost overruns | Medium | High | Track tokens, add budget alerts |

---

## 9. Success Criteria

- [ ] All tasks execute via real AI agents (no simulation)
- [ ] Task outputs match task descriptions
- [ ] Files created are actual usable files
- [ ] URLs are real accessible URLs
- [ ] Errors properly reported and logged
- [ ] No "Completed step successfully" without actual work
- [ ] Server stable for 24+ hours
- [ ] Can handle 5+ concurrent executions

---

## 10. Post-Implementation Tasks

- [ ] Update documentation
- [ ] Create user guide
- [ ] Add cost tracking dashboard
- [ ] Implement agent type selection
- [ ] Add execution history search
- [ ] Performance optimization
- [ ] Error recovery mechanisms

---

## Appendices

### A. Current File Structure
```
~/Desktop/Claw Creations/
├── server.js                    # Main server (currently corrupted)
├── agent-dashboard.html         # Frontend
├── agent-spawner.js             # New: Agent execution module
├── IMPLEMENTATION_PLAN.md       # This document
├── outputs/                     # Task outputs
├── tasks.json                   # Task storage
├── reports.json                 # Report storage
└── archive.json                 # Archive storage

~/.openclaw/workspace/plans/
├── active/                      # Active plans
├── archive/                     # Archived plans
└── templates/                   # Plan templates
```

### B. API Endpoints Status
| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /plans/:taskId/planning | BROKEN | Uses hardcoded template |
| POST /plans/:taskId/execute | BROKEN | Uses simulation code |
| GET /sessions/active | WORKING | Returns empty (no real sessions) |
| GET /tasks | WORKING | Basic CRUD works |
| WebSocket | WORKING | But broadcasts fake events |

### C. OpenRouter Configuration
**Endpoint:** https://openrouter.ai/api/v1  
**Model:** openrouter/moonshotai/kimi-k2.5  
**Cost:** ~$0.0005 per 1K tokens  
**Timeout:** 5 minutes per request  
**Rate Limit:** 20 requests per minute

### D. Session Spawn Command
```bash
# How OpenClaw spawns agents
openclaw sessions spawn --task "prompt" --model "model-id"

# Or programmatically via Node
const result = await spawnAgentWithResult({
  task: prompt,
  model: 'openrouter/moonshotai/kimi-k2.5',
  timeoutSeconds: 300
});
```

---

**Document Classification:** Internal Planning  
**Next Action:** Awaiting review and approval  
**DO NOT PROCEED WITH IMPLEMENTATION WITHOUT REVIEW**
