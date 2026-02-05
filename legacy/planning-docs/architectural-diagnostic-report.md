# Kanban Agent Execution Framework
## Architectural Diagnostic Report

**Date:** 2026-02-05  
**Reporter:** Telli (The Intelligent Claw Machine)  
**Severity:** HIGH - Production stability at risk  
**Classification:** Architecture / State Management / Fault Tolerance

---

## Executive Summary

The Kanban Agent Execution Framework exhibits critical architectural flaws in state management and execution flow that result in:

1. **Orphaned tasks** stuck in "planning" or "executing" states indefinitely
2. **Lost execution history** on every server restart
3. **Failed auto-executions** due to fragile setTimeout-based scheduling
4. **Inconsistent UI state** showing tasks as "running" when no agent is active

**Impact:** Users cannot trust task execution status, may lose work, and experience degraded reliability. The current architecture is unsuitable for production use without immediate remediation.

---

## Findings Overview

| ID | Issue | Severity | Root Cause |
|----|-------|----------|------------|
| ARCH-001 | In-Memory Session Store | **CRITICAL** | `activeSessions` is a Map, lost on restart |
| ARCH-002 | In-Memory History Store | **HIGH** | `pastSessions` is an array, lost on restart |
| ARCH-003 | Fragile Auto-Execution | **CRITICAL** | setTimeout(500ms) scheduled, lost on restart |
| ARCH-004 | No State Reconciliation | **HIGH** | No startup validation of task vs session state |
| ARCH-005 | Stale Task Status | **MEDIUM** | `executionStatus` not reset when session lost |
| ARCH-006 | No Job Queue | **HIGH** | Execution order not guaranteed, no retries |

---

## Detailed Findings

### ARCH-001: In-Memory Active Session Store (CRITICAL)

**Location:** `server.js:3134`
```javascript
const activeSessions = new Map(); // In-memory only
```

**Problem:**
- All active agent sessions stored in memory
- Server restart = total loss of session state
- No way to recover running agents or track their progress

**Evidence:**
```
Session d7ecd252-4aa5-... started at 00:21
Server restarted at 00:42
Session gone, no recovery possible
Task status still "planning" in tasks.json
```

**Risk:**
- Running agents become "ghosts" - still executing but untracked
- Users cannot kill orphaned agents
- Resource leaks (agents running indefinitely)

**Recommended Fix:**
```javascript
// Add to CONFIG
const SESSIONS_FILE = path.join(CONFIG.BASE_DIR, 'active-sessions.json');

// Persist on every change
async function persistActiveSessions() {
  const sessions = Array.from(activeSessions.entries());
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// Restore on startup
async function restoreActiveSessions() {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf8');
    const sessions = JSON.parse(data);
    for (const [id, session] of sessions) {
      activeSessions.set(id, session);
    }
    console.log(`Restored ${sessions.length} active sessions`);
  } catch (err) {
    console.log('No active sessions to restore');
  }
}
```

---

### ARCH-002: In-Memory History Store (HIGH)

**Location:** `server.js:3135`
```javascript
const pastSessions = []; // In-memory only
```

**Problem:**
- All completed/failed/killed session history stored in memory
- Server restart = total loss of execution history
- "Past Sessions" UI section permanently empty after restart

**Evidence:**
```
User: "Why isn't this in Past Sessions?"
Reason: Server was restarted at 00:42
```

**Risk:**
- No audit trail of agent executions
- Cannot analyze cost trends or success rates
- Users cannot review previous task outputs

**Recommended Fix:**
```javascript
// Add to CONFIG
const PAST_SESSIONS_FILE = path.join(CONFIG.BASE_DIR, 'past-sessions.json');

// Modify archiveSession()
async function archiveSession(session) {
  const completedSession = {
    ...session,
    completedAt: new Date().toISOString(),
    durationMs: session.startedAt ? Date.now() - new Date(session.startedAt).getTime() : 0
  };
  
  // Calculate metadata...
  
  pastSessions.unshift(completedSession);
  if (pastSessions.length > 50) pastSessions.pop();
  
  // PERSIST TO DISK
  await fs.writeFile(PAST_SESSIONS_FILE, JSON.stringify(pastSessions, null, 2));
  
  console.log(`Session archived and persisted: ${session.id}`);
}

// Restore on startup
async function restorePastSessions() {
  try {
    const data = await fs.readFile(PAST_SESSIONS_FILE, 'utf8');
    const sessions = JSON.parse(data);
    pastSessions.push(...sessions);
    console.log(`Restored ${sessions.length} past sessions`);
  } catch (err) {
    console.log('No past sessions to restore');
  }
}
```

---

### ARCH-003: Fragile Auto-Execution via setTimeout (CRITICAL)

**Location:** `server.js:~4024`
```javascript
setTimeout(async () => {
  try {
    activeSessions.delete(sessionId);
    broadcastUpdate('session-ended', { sessionId, taskId });
    await executePlan(taskId, task);
  } catch (execErr) {
    console.error(`Auto-execution failed:`, execErr);
  }
}, 500); // Only 500ms window!
```

**Problem:**
- Auto-execution scheduled with 500ms delay
- Server restart = callback lost forever
- No retry mechanism
- No persistence of pending executions

**Evidence:**
```
00:23 - Planning complete, setTimeout scheduled
00:42 - Server restarted (before 500ms fired)
Result: Execution never started, task stuck in "planning"
```

**Risk:**
- Tasks can become permanently stuck
- User must manually trigger execution
- Silent failures (no error logged)

**Recommended Fix:**

**Option A: Immediate Execution (Recommended)**
```javascript
// Remove setTimeout entirely
// Planning succeeds → execute immediately

console.log(`🚀 Auto-executing plan for task ${taskId}`);

// Remove planning session
activeSessions.delete(sessionId);
broadcastUpdate('session-ended', { sessionId, taskId });

// Execute immediately (no setTimeout)
try {
  await executePlan(taskId, task);
} catch (execErr) {
  console.error(`❌ Auto-execution failed:`, execErr);
  // Update task status to reflect error
  const tasks = await getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.executionStatus = 'error';
    await saveTasks(tasks);
  }
}
```

**Option B: Persistent Job Queue**
```javascript
// Add to CONFIG
const EXECUTION_QUEUE_FILE = path.join(CONFIG.BASE_DIR, 'execution-queue.json');

// Add job to queue
async function queueExecution(taskId, task) {
  const queue = await readJson(EXECUTION_QUEUE_FILE) || [];
  queue.push({ taskId, task, queuedAt: new Date().toISOString() });
  await fs.writeFile(EXECUTION_QUEUE_FILE, JSON.stringify(queue, null, 2));
}

// Process queue on startup
async function processExecutionQueue() {
  const queue = await readJson(EXECUTION_QUEUE_FILE) || [];
  await fs.writeFile(EXECUTION_QUEUE_FILE, '[]'); // Clear queue
  
  for (const job of queue) {
    console.log(`Processing queued execution: ${job.taskId}`);
    try {
      await executePlan(job.taskId, job.task);
    } catch (err) {
      console.error(`Queued execution failed:`, err);
    }
  }
}

// Call in initialize()
await processExecutionQueue();
```

---

### ARCH-004: No State Reconciliation on Startup (HIGH)

**Location:** `server.js:4322` - `initialize()` function

**Problem:**
- Server starts without validating task state consistency
- Tasks marked "planning" or "executing" may have no active session
- No automatic recovery from crashes/restarts

**Evidence:**
```
Task d7ecd252-... status: "planning"
Active sessions: 0
Plan file exists: Yes
Result: Orphaned task - plan ready but execution never started
```

**Risk:**
- Stale UI state confuses users
- Tasks require manual intervention to recover
- No automated fault recovery

**Recommended Fix:**
```javascript
// Add to initialize() function
async function reconcileTaskStates() {
  console.log('🔄 Reconciling task states...');
  
  const tasks = await getTasks();
  let fixedCount = 0;
  
  for (const task of tasks) {
    // Check for orphaned "planning" tasks
    if (task.executionStatus === 'planning') {
      const planExists = await fs.access(
        path.join(PLANS_CONFIG.ACTIVE_DIR, task.id, 'plan.md')
      ).then(() => true).catch(() => false);
      
      if (planExists && !activeSessions.has(`session-${task.id}`)) {
        // Plan created but execution never started
        task.executionStatus = 'plan-ready';
        console.log(`  Fixed orphaned planning task: ${task.id}`);
        fixedCount++;
      }
    }
    
    // Check for orphaned "executing" tasks
    if (task.executionStatus === 'executing') {
      const hasActiveSession = Array.from(activeSessions.values())
        .some(s => s.taskId === task.id);
      
      if (!hasActiveSession) {
        // Execution was interrupted
        task.executionStatus = 'error';
        task.executionError = 'Execution interrupted by server restart';
        console.log(`  Fixed orphaned executing task: ${task.id}`);
        fixedCount++;
      }
    }
  }
  
  if (fixedCount > 0) {
    await saveTasks(tasks);
    console.log(`✅ Fixed ${fixedCount} orphaned tasks`);
  } else {
    console.log('✅ All task states consistent');
  }
}

// Call in initialize()
await reconcileTaskStates();
```

---

### ARCH-005: Stale Task Execution Status (MEDIUM)

**Location:** `tasks.json` - `executionStatus` field

**Problem:**
- `executionStatus` is the source of truth for UI
- Not updated when session is lost
- UI shows "running" spinner even though nothing is running

**Evidence:**
```javascript
// tasks.json
{
  "id": "d7ecd252-...",
  "executionStatus": "planning",  // Stuck here
  "status": "today"
}
```

**Risk:**
- Users confused about actual task state
- Cannot reliably determine if task needs intervention

**Recommended Fix:**
See ARCH-004 (reconcileTaskStates) for the fix. Additionally:

```javascript
// Add computed status getter
function getEffectiveExecutionStatus(task) {
  // If no active session for this task, status is stale
  const hasActiveSession = Array.from(activeSessions.values())
    .some(s => s.taskId === task.id);
  
  if (!hasActiveSession && ['planning', 'executing'].includes(task.executionStatus)) {
    return 'interrupted'; // Or 'plan-ready' if plan exists
  }
  
  return task.executionStatus;
}

// Use in API responses
app.get('/api/v1/tasks', async (req, res) => {
  const tasks = await getTasks();
  const tasksWithEffectiveStatus = tasks.map(t => ({
    ...t,
    effectiveExecutionStatus: getEffectiveExecutionStatus(t)
  }));
  res.json({ tasks: tasksWithEffectiveStatus });
});
```

---

### ARCH-006: No Persistent Job Queue (HIGH)

**Problem:**
- Execution order not guaranteed
- No retry mechanism for failed steps
- No way to pause/resume execution
- Concurrent executions not managed

**Current Flow:**
```
User clicks Start → spawnAgentWithResult() → wait for completion
```

**Problems:**
- If step 2 fails, must restart entire task
- Cannot queue multiple tasks
- No priority handling

**Recommended Fix:**

Implement a persistent job queue with states:

```javascript
// Job states: pending → running → completed|failed
const JOB_QUEUE_FILE = path.join(CONFIG.BASE_DIR, 'job-queue.json');

async function enqueueJob(taskId, stepNumber, priority = 'normal') {
  const queue = await readJson(JOB_QUEUE_FILE) || [];
  
  const job = {
    id: `job-${Date.now()}`,
    taskId,
    stepNumber,
    status: 'pending',
    priority,
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: 3
  };
  
  queue.push(job);
  await fs.writeFile(JOB_QUEUE_FILE, JSON.stringify(queue, null, 2));
  
  // Trigger queue processor
  processJobQueue();
}

async function processJobQueue() {
  const queue = await readJson(JOB_QUEUE_FILE) || [];
  
  // Find next pending job
  const pendingJob = queue.find(j => j.status === 'pending');
  if (!pendingJob) return;
  
  // Mark as running
  pendingJob.status = 'running';
  pendingJob.startedAt = new Date().toISOString();
  pendingJob.attempts++;
  await fs.writeFile(JOB_QUEUE_FILE, JSON.stringify(queue, null, 2));
  
  try {
    // Execute
    await executeStep(pendingJob.taskId, pendingJob.stepNumber);
    
    // Mark completed
    pendingJob.status = 'completed';
    pendingJob.completedAt = new Date().toISOString();
  } catch (err) {
    // Mark failed or retry
    if (pendingJob.attempts < pendingJob.maxAttempts) {
      pendingJob.status = 'pending'; // Will be retried
      pendingJob.error = err.message;
    } else {
      pendingJob.status = 'failed';
      pendingJob.error = err.message;
    }
  }
  
  await fs.writeFile(JOB_QUEUE_FILE, JSON.stringify(queue, null, 2));
  
  // Process next
  processJobQueue();
}
```

---

## Implementation Priority

### Phase 1: Critical (Do First)
1. **ARCH-001** - Persist active sessions
2. **ARCH-003** - Remove setTimeout, execute immediately
3. **ARCH-004** - Add state reconciliation on startup

### Phase 2: High Priority
4. **ARCH-002** - Persist past sessions
5. **ARCH-006** - Implement job queue

### Phase 3: Medium Priority
6. **ARCH-005** - Add effective status computation

---

## Testing Recommendations

1. **Restart Test:** Start a task, restart server mid-execution, verify recovery
2. **Persistence Test:** Complete several tasks, restart server, verify history retained
3. **Concurrency Test:** Start multiple tasks simultaneously, verify queue behavior
4. **Failure Test:** Kill server during execution, verify proper error state on restart

---

## Appendix: Files to Modify

| File | Lines to Add/Modify |
|------|---------------------|
| `server.js` | ~100 lines for persistence, reconciliation, queue |
| `agent-dashboard.html` | ~20 lines for effective status display |
| `tasks.json` | Automatic (field additions) |

---

## Conclusion

The Kanban Agent Execution Framework requires architectural changes to achieve production reliability. The current in-memory state management approach is unsuitable for any deployment where server restarts may occur. 

**Estimated effort:** 4-6 hours for Phase 1 implementation  
**Risk if not fixed:** User data loss, system unreliability, production unsuitability

---

*Report generated by Telli*  
*The Intelligent Claw Machine*
