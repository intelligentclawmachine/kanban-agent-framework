# Production Agent Execution Implementation Plan

## Executive Summary
Replace ALL simulation code with real OpenClaw agent execution using `sessions_spawn` API.

## Critical Changes Required

### Phase 1: Real Planning Agent (Replace Fake Plan Template)
**File:** `server.js`, Planning endpoint (`POST /api/v1/plans/:taskId/planning`)

**Current Behavior:**
- Generates hardcoded 4-step to-do list template
- Always creates same plan regardless of task

**Production Behavior:**
- Spawn planning agent via `sessions_spawn`
- Agent analyzes task and creates real execution plan
- Plan saved to disk with actual steps based on task content

**Implementation:**
```javascript
// Spawn planning agent
const planningResult = await spawnAgentWithResult({
  task: `Create detailed execution plan for: ${task.title}\n${task.description}`,
  outputPath: `~/.openclaw/workspace/plans/active/${taskId}/plan.md`,
  model: 'openrouter/moonshotai/kimi-k2.5'
});

// Agent outputs YAML frontmatter + markdown plan
// Parse and validate before marking ready
```

---

### Phase 2: Real Execution Agent (Replace spawnSubAgent Simulation)
**File:** `server.js`, `spawnSubAgent()` and `executeStepWithAgent()`

**Current Behavior:**
- 3-second delay faking "work"
- String pattern matching on titles
- Hardcoded outputs for 6 task types
- Generic "Step completed" for everything else

**Production Behavior:**
- Each step spawns real agent via `sessions_spawn`
- Agent receives full context: task, step instructions, previous outputs
- Agent executes and returns actual results
- Output parsed for files, URLs, completion status

**Implementation:**
```javascript
async function executeStepWithAgent(taskId, step, allSteps, execId) {
  const agentPrompt = buildExecutionPrompt(task, step, allSteps);
  
  const result = await spawnAgentWithResult({
    task: agentPrompt,
    outputPath: `~/.openclaw/workspace/plans/active/${taskId}/step-${step.number}-output.txt`,
    model: 'openrouter/moonshotai/kimi-k2.5'
  });
  
  // Parse agent output for:
  // - STEP_COMPLETE / STEP_ERROR
  // - Files Created: [paths]
  // - URLs: [urls]
  // - Notes: [details]
  
  return parseAgentOutput(result.output);
}
```

---

### Phase 3: Agent Output Parser
**New Function:** `parseAgentOutput(output)`

**Responsibilities:**
- Extract completion status (STEP_COMPLETE vs STEP_ERROR)
- Parse file paths from "Files Created:" section
- Extract URLs from "URLs:" section
- Capture notes and result description
- Validate files actually exist on disk

---

### Phase 4: sessions_spawn Integration
**New Module:** `agent-spawner.js`

**API:**
```javascript
async function spawnAgentWithResult({
  task,                    // Full prompt for agent
  outputPath,             // Where agent should save output
  model,                  // Model to use
  timeoutSeconds = 300    // Max execution time
}) {
  // Use OpenClaw sessions_spawn tool
  // Wait for completion
  // Return { output, files, urls, success, error }
}
```

**Implementation Options:**
1. Use `sessions_spawn` tool directly via OpenClaw CLI
2. Call OpenClaw API if exposed
3. Execute agent in subprocess with proper monitoring

---

### Phase 5: Error Handling & Retries

**Retry Logic:**
- Step fails → Retry up to 2 times
- Agent timeout → Mark step as failed, continue with next
- Critical failure → Stop execution, report error

**Failure Reporting:**
- Capture full agent output on error
- Log to execution log
- Report to user with actionable info

---

### Phase 6: Testing & Validation

**Test Cases:**
1. Simple task (create text file)
2. Complex task (multi-step with dependencies)
3. Task that fails (verify error reporting)
4. Task with file outputs (verify files created)
5. GitHub task (verify repo creation)

---

## Implementation Order

1. **Create `spawnAgentWithResult()` wrapper** - Core agent execution
2. **Rewrite `executeStepWithAgent()`** - Use real agent
3. **Rewrite `spawnSubAgent()`** - Remove simulation
4. **Update planning endpoint** - Real planning agent
5. **Add output parser** - Parse agent responses
6. **Test end-to-end** - Validate full flow

## Files Modified

- `server.js` - Major rewrite of execution flow
- New: `agent-spawner.js` - Agent spawning module
- New: `output-parser.js` - Agent output parsing

## Success Criteria

- [ ] Clicking Start on any task spawns real agent
- [ ] Agent output contains actual task-specific content
- [ ] Files are actually created (not just claimed)
- [ ] URLs are verified accessible
- [ ] Errors show real failure reasons
- [ ] No hardcoded templates or simulation delays

## Estimated Time

2-3 hours for full implementation and testing.
