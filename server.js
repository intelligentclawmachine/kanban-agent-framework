/**
 * Obsidian-Integrated Kanban Task Management System
 * API Server - Phases 1-3 Complete
 * 
 * Port: 3001
 * Base URL: http://localhost:3001/api/v1
 * WebSocket: ws://localhost:3001
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const matter = require('gray-matter');
const cron = require('node-cron');
const chokidar = require('chokidar');
const http = require('http');
const WebSocket = require('ws');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Production agent execution module
const { spawnAgentWithResult, parseAgentOutput } = require('./agent-spawner');

const app = express();
const PORT = 3001;

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const PLANS_CONFIG = {
  BASE_DIR: path.join(process.env.HOME, '.openclaw/workspace/plans'),
  ACTIVE_DIR: path.join(process.env.HOME, '.openclaw/workspace/plans/active'),
  ARCHIVE_DIR: path.join(process.env.HOME, '.openclaw/workspace/plans/archive'),
  TEMPLATES_DIR: path.join(process.env.HOME, '.openclaw/workspace/plans/templates'),
  TEMPLATE_FILE: path.join(process.env.HOME, '.openclaw/workspace/plans/templates/plan-template.md'),
  PLANNING_PROMPT: path.join(process.env.HOME, '.openclaw/workspace/plans/templates/planning-agent-prompt.md'),
  EXECUTION_PROMPT: path.join(process.env.HOME, '.openclaw/workspace/plans/templates/execution-agent-prompt.md')
};

const CONFIG = {
  BASE_DIR: path.join(process.env.HOME, 'Desktop/Claw Creations'),
  OUTPUTS_DIR: path.join(process.env.HOME, 'Desktop/Claw Creations/outputs'),
  THUMBNAILS_DIR: path.join(process.env.HOME, 'Desktop/Claw Creations/thumbnails'),
  OBSIDIAN_VAULT: path.join(process.env.HOME, 'Documents/Obsidian/Tasks'),
  OBSIDIAN_VAULT_FULL: path.join(process.env.HOME, 'Documents/Obsidian'),
  TASKS_FILE: path.join(process.env.HOME, 'Desktop/Claw Creations/tasks.json'),
  FILES_FILE: path.join(process.env.HOME, 'Desktop/Claw Creations/files.json'),
  EVENTS_FILE: path.join(process.env.HOME, 'Desktop/Claw Creations/events.json'),
  REPORTS_FILE: path.join(process.env.HOME, 'Desktop/Claw Creations/reports.json'),
  ARCHIVE_FILE: path.join(process.env.HOME, 'Desktop/Claw Creations/archive.json'),
  ACTIVE_SESSIONS_FILE: path.join(process.env.HOME, 'Desktop/Claw Creations/active-sessions.json'),
  PAST_SESSIONS_FILE: path.join(process.env.HOME, 'Desktop/Claw Creations/past-sessions.json'),
  EXECUTION_QUEUE_FILE: path.join(process.env.HOME, 'Desktop/Claw Creations/execution-queue.json'),
  SYNC_INTERVAL_MS: 30000,
  WATCHER_IGNORE_PATTERNS: [
    '**/.obsidian/**',
    '**/node_modules/**',
    '**/.git/**',
    '**/*.tmp',
    '**/*.swp'
  ]
};

const PRIORITY_WEIGHTS = {
  'P0': 100,
  'P1': 75,
  'P2': 50,
  'P3': 25
};

const STATUS_ORDER = ['backlog', 'today', 'tomorrow', 'done'];

// ============================================
// PLAN STORAGE INFRASTRUCTURE (Phase 1)
// ============================================

/**
 * Initialize plan storage directories
 */
async function initializePlanStorage() {
  const dirs = [
    PLANS_CONFIG.BASE_DIR,
    PLANS_CONFIG.ACTIVE_DIR,
    PLANS_CONFIG.ARCHIVE_DIR,
    PLANS_CONFIG.TEMPLATES_DIR
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 Plan directory ready: ${path.relative(process.env.HOME, dir)}`);
    } catch (err) {
      console.warn(`Could not create plan directory ${dir}:`, err.message);
    }
  }
}

/**
 * Write a plan to the active directory
 * @param {string} taskId - Unique task identifier
 * @param {string} planContent - Markdown content of the plan
 * @returns {Promise<string>} Path to the written plan file
 */
async function writePlan(taskId, planContent) {
  try {
    const planDir = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId);
    await fs.mkdir(planDir, { recursive: true });
    
    const planPath = path.join(planDir, 'plan.md');
    const timestamp = new Date().toISOString();
    
    // Add metadata header if not present
    let content = planContent;
    if (!content.includes('---')) {
      content = `---
taskId: ${taskId}
created: ${timestamp}
status: draft
---

${content}`;
    }
    
    await fs.writeFile(planPath, content, 'utf8');
    
    // Initialize empty context and log files
    await saveContext(taskId, { created: timestamp, taskId });
    await appendLog(taskId, { 
      timestamp, 
      level: 'info', 
      message: 'Plan created',
      agent: 'planning-agent'
    });
    
    console.log(`📝 Plan written: ${path.relative(PLANS_CONFIG.BASE_DIR, planPath)}`);
    return planPath;
  } catch (err) {
    console.error(`Error writing plan for task ${taskId}:`, err);
    throw err;
  }
}

/**
 * Read a plan from the active directory
 * @param {string} taskId - Unique task identifier
 * @returns {Promise<Object>} Plan data with content and metadata
 */
async function readPlan(taskId) {
  try {
    const planPath = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId, 'plan.md');
    const content = await fs.readFile(planPath, 'utf8');
    const parsed = matter(content);
    
    return {
      taskId,
      content: parsed.content,
      metadata: parsed.data,
      path: planPath
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    console.error(`Error reading plan for task ${taskId}:`, err);
    throw err;
  }
}

/**
 * Check if a plan exists
 * @param {string} taskId - Unique task identifier
 * @returns {Promise<boolean>} True if plan exists
 */
async function planExists(taskId) {
  try {
    const planPath = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId, 'plan.md');
    await fs.access(planPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Archive a completed plan
 * @param {string} taskId - Unique task identifier
 * @param {Object} completionData - Completion metadata
 * @returns {Promise<string>} Path to the archived plan directory
 */
async function archivePlan(taskId, completionData = {}) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const archiveDateDir = path.join(PLANS_CONFIG.ARCHIVE_DIR, today);
    const archiveDir = path.join(archiveDateDir, taskId);
    const activeDir = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId);
    
    // Ensure archive date directory exists
    await fs.mkdir(archiveDateDir, { recursive: true });
    await fs.mkdir(archiveDir, { recursive: true });
    
    // Read all files from active directory
    let files = [];
    try {
      files = await fs.readdir(activeDir);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`No active plan found for task ${taskId}`);
      }
      throw err;
    }
    
    // Move each file to archive
    for (const file of files) {
      const srcPath = path.join(activeDir, file);
      const destPath = path.join(archiveDir, file);
      await fs.copyFile(srcPath, destPath);
      await fs.unlink(srcPath);
    }
    
    // Create completion metadata
    const completionMeta = {
      taskId,
      archivedAt: new Date().toISOString(),
      archivedDate: today,
      ...completionData
    };
    await fs.writeFile(
      path.join(archiveDir, 'completion.json'),
      JSON.stringify(completionMeta, null, 2),
      'utf8'
    );
    
    // Remove empty active directory
    await fs.rmdir(activeDir);
    
    console.log(`📦 Plan archived: ${path.relative(PLANS_CONFIG.BASE_DIR, archiveDir)}`);
    return archiveDir;
  } catch (err) {
    console.error(`Error archiving plan for task ${taskId}:`, err);
    throw err;
  }
}

/**
 * List all active plans
 * @returns {Promise<Array>} Array of active plan summaries
 */
async function listActivePlans() {
  try {
    const entries = await fs.readdir(PLANS_CONFIG.ACTIVE_DIR, { withFileTypes: true });
    const plans = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const taskId = entry.name;
        try {
          const plan = await readPlan(taskId);
          const context = await loadContext(taskId);
          if (plan) {
            plans.push({
              taskId,
              metadata: plan.metadata,
              created: plan.metadata.created,
              status: plan.metadata.status || 'unknown',
              hasContext: !!context
            });
          }
        } catch (err) {
          console.warn(`Error reading plan ${taskId}:`, err.message);
        }
      }
    }
    
    return plans.sort((a, b) => new Date(b.created) - new Date(a.created));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    console.error('Error listing active plans:', err);
    throw err;
  }
}

// ============================================
// CONTEXT SNAPSHOT SYSTEM
// ============================================

/**
 * Save context data for a task
 * @param {string} taskId - Unique task identifier
 * @param {Object} contextData - Context data to save
 * @returns {Promise<string>} Path to the context file
 */
async function saveContext(taskId, contextData) {
  try {
    const planDir = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId);
    await fs.mkdir(planDir, { recursive: true });
    
    const contextPath = path.join(planDir, 'context.json');
    const timestamp = new Date().toISOString();
    
    const context = {
      taskId,
      updated: timestamp,
      ...contextData
    };
    
    await fs.writeFile(contextPath, JSON.stringify(context, null, 2), 'utf8');
    return contextPath;
  } catch (err) {
    console.error(`Error saving context for task ${taskId}:`, err);
    throw err;
  }
}

/**
 * Load context data for a task
 * @param {string} taskId - Unique task identifier
 * @returns {Promise<Object|null>} Context data or null if not found
 */
async function loadContext(taskId) {
  try {
    const contextPath = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId, 'context.json');
    const data = await fs.readFile(contextPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    console.error(`Error loading context for task ${taskId}:`, err);
    throw err;
  }
}

// ============================================
// EXECUTION LOG SYSTEM
// ============================================

/**
 * Append an entry to the execution log
 * @param {string} taskId - Unique task identifier
 * @param {Object} entry - Log entry
 * @returns {Promise<string>} Path to the log file
 */
async function appendLog(taskId, entry) {
  try {
    const planDir = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId);
    await fs.mkdir(planDir, { recursive: true });
    
    const logPath = path.join(planDir, 'log.md');
    const timestamp = entry.timestamp || new Date().toISOString();
    
    const level = entry.level || 'info';
    const levelEmoji = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'blocker': '🚫',
      'agent': '🤖'
    }[level] || 'ℹ️';
    
    const logEntry = `\n## ${timestamp} ${levelEmoji} ${level.toUpperCase()}\n\n`;
    
    if (entry.agent) {
      logEntry + `**Agent:** ${entry.agent}\n\n`;
    }
    
    if (entry.stepNumber) {
      logEntry + `**Step:** ${entry.stepNumber}\n\n`;
    }
    
    logEntry + `${entry.message}\n\n`;
    
    if (entry.details) {
      logEntry + `**Details:** ${entry.details}\n\n`;
    }
    
    if (entry.output) {
      logEntry + `**Output:** ${entry.output}\n\n`;
    }
    
    // Append to file (create if doesn't exist)
    try {
      await fs.appendFile(logPath, logEntry, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Create new log file with header
        const header = `# Execution Log: ${taskId}\n\n*Auto-generated execution log*\n`;
        await fs.writeFile(logPath, header + logEntry, 'utf8');
      } else {
        throw err;
      }
    }
    
    return logPath;
  } catch (err) {
    console.error(`Error appending log for task ${taskId}:`, err);
    throw err;
  }
}

/**
 * Read the execution log for a task
 * @param {string} taskId - Unique task identifier
 * @returns {Promise<string|null>} Log content or null if not found
 */
async function readLog(taskId) {
  try {
    const logPath = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId, 'log.md');
    return await fs.readFile(logPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    console.error(`Error reading log for task ${taskId}:`, err);
    throw err;
  }
}

/**
 * Log an agent spawn event
 * @param {string} taskId - Task being executed
 * @param {string} agentType - Type of agent spawned
 * @param {string} stepNumber - Step being executed
 */
async function logAgentSpawn(taskId, agentType, stepNumber = null) {
  return appendLog(taskId, {
    timestamp: new Date().toISOString(),
    level: 'agent',
    agent: agentType,
    stepNumber,
    message: `Agent spawned: ${agentType}`,
    details: stepNumber ? `Executing step ${stepNumber}` : 'Initializing'
  });
}

/**
 * Log a step completion event
 * @param {string} taskId - Task being executed
 * @param {number} stepNumber - Completed step number
 * @param {string} result - Result description
 */
async function logStepComplete(taskId, stepNumber, result) {
  return appendLog(taskId, {
    timestamp: new Date().toISOString(),
    level: 'success',
    stepNumber,
    message: `Step ${stepNumber} completed`,
    output: result
  });
}

/**
 * Log an error or blocker event
 * @param {string} taskId - Task being executed
 * @param {string} error - Error description
 * @param {boolean} isBlocker - Whether this blocks execution
 */
async function logError(taskId, error, isBlocker = false) {
  return appendLog(taskId, {
    timestamp: new Date().toISOString(),
    level: isBlocker ? 'blocker' : 'error',
    message: isBlocker ? 'Execution blocked' : 'Error encountered',
    details: error
  });
}

// ============================================
// WEBSOCKET SERVER FOR REAL-TIME UPDATES
// ============================================

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
const wsClients = new Set();

wss.on('connection', (ws) => {
  console.log('📡 WebSocket client connected');
  wsClients.add(ws);
  
  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
    wsClients.delete(ws);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    wsClients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcastUpdate(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ============================================
// FILE WATCHER FOR OBSIDIAN SYNC
// ============================================

let obsidianWatcher = null;
let lastObsidianUpdate = null;

async function initFileWatcher() {
  try {
    // Ensure Tasks directory exists
    await fs.mkdir(CONFIG.OBSIDIAN_VAULT, { recursive: true });
    await fs.mkdir(path.join(CONFIG.OBSIDIAN_VAULT, 'today'), { recursive: true });
    await fs.mkdir(path.join(CONFIG.OBSIDIAN_VAULT, 'tomorrow'), { recursive: true });
    await fs.mkdir(path.join(CONFIG.OBSIDIAN_VAULT, 'backlog'), { recursive: true });
    await fs.mkdir(path.join(CONFIG.OBSIDIAN_VAULT, 'done'), { recursive: true });
    
    obsidianWatcher = chokidar.watch(
      `${CONFIG.OBSIDIAN_VAULT}/**/*.md`,
      {
        persistent: true,
        ignoreInitial: true,
        ignorePattern: CONFIG.WATCHER_IGNORE_PATTERNS,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      }
    );
    
    obsidianWatcher
      .on('add', async (filepath) => {
        console.log(`📄 Obsidian file added: ${path.relative(CONFIG.OBSIDIAN_VAULT, filepath)}`);
        await handleObsidianFileChange(filepath, 'add');
      })
      .on('change', async (filepath) => {
        console.log(`📝 Obsidian file changed: ${path.relative(CONFIG.OBSIDIAN_VAULT, filepath)}`);
        await handleObsidianFileChange(filepath, 'change');
      })
      .on('unlink', async (filepath) => {
        console.log(`🗑️ Obsidian file deleted: ${path.relative(CONFIG.OBSIDIAN_VAULT, filepath)}`);
        await handleObsidianFileChange(filepath, 'unlink');
      });
    
    console.log('👀 Obsidian file watcher initialized');
    
    // Also watch for backlink references in entire vault
    const backlinkWatcher = chokidar.watch(
      `${CONFIG.OBSIDIAN_VAULT_FULL}/**/*.md`,
      {
        persistent: true,
        ignoreInitial: true,
        ignorePattern: [...CONFIG.WATCHER_IGNORE_PATTERNS, `${CONFIG.OBSIDIAN_VAULT}/**/*.md`],
        awaitWriteFinish: {
          stabilityThreshold: 3000,
          pollInterval: 200
        }
      }
    );
    
    backlinkWatcher.on('change', async (filepath) => {
      await scanBacklinks();
    });
    
    console.log('🔗 Backlink scanner initialized');
    
  } catch (err) {
    console.warn('Could not initialize file watcher:', err.message);
  }
}

async function handleObsidianFileChange(filepath, eventType) {
  const filename = path.basename(filepath);
  const taskId = filename.replace('.md', '');
  
  // Debounce rapid changes
  const now = Date.now();
  if (lastObsidianUpdate && (now - lastObsidianUpdate) < 2000) {
    return; // Skip if less than 2 seconds since last update
  }
  lastObsidianUpdate = now;
  
  try {
    if (eventType === 'unlink') {
      // File deleted in Obsidian - soft delete in tasks
      const tasks = await getTasks();
      const task = tasks.find(t => t.obsidianPath === filepath);
      if (task) {
        task.status = 'deleted';
        task.updated = new Date().toISOString();
        await saveTasks(tasks);
        
        await logEvent({
          type: 'system',
          severity: 'warning',
          title: 'Task deleted in Obsidian',
          description: `Task "${task.title}" was deleted in Obsidian`,
          metadata: { taskId: task.id, filepath }
        });
        
        broadcastUpdate('task-deleted', { taskId: task.id });
      }
    } else {
      // File added or changed - pull changes
      // await pullFromObsidian(); // DISABLED
      broadcastUpdate('tasks-refreshed', { timestamp: new Date().toISOString() });
      
      await logEvent({
        type: 'system',
        severity: 'info',
        title: `Task ${eventType === 'add' ? 'created' : 'updated'} in Obsidian`,
        description: `Synced from: ${path.relative(CONFIG.OBSIDIAN_VAULT, filepath)}`,
        metadata: { taskId, eventType }
      });
    }
  } catch (err) {
    console.error('Error handling Obsidian file change:', err);
    await logEvent({
      type: 'system',
      severity: 'error',
      title: 'Obsidian sync error',
      description: err.message,
      metadata: { filepath, eventType, error: err.stack }
    });
  }
}

// Extract backlinks from Obsidian files
async function scanBacklinks() {
  try {
    const tasks = await getTasks();
    const backlinks = new Map(); // taskId -> Set of backlinks
    
    // Scan all task files for backlink references
    for (const task of tasks) {
      if (task.obsidianPath) {
        try {
          const content = await fs.readFile(task.obsidianPath, 'utf8');
          // Extract [[WikiLinks]] and regular links
          const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
          const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
          
          const backlinksSet = new Set();
          let match;
          
          while ((match = wikiLinkPattern.exec(content)) !== null) {
            const linkTarget = match[1].split('|')[0].trim();
            if (linkTarget !== task.title) {
              backlinksSet.add(`[[${linkTarget}]]`);
            }
          }
          
          while ((match = markdownLinkPattern.exec(content)) !== null) {
            const linkTarget = match[2];
            if (linkTarget && !linkTarget.includes(task.id)) {
              backlinksSet.add(`[${match[1]}](${linkTarget})`);
            }
          }
          
          if (backlinksSet.size > 0) {
            backlinks.set(task.id, Array.from(backlinksSet));
          }
        } catch (err) {
          // File might not exist yet
        }
      }
    }
    
    // Update tasks with backlinks
    if (backlinks.size > 0) {
      const tasksData = await getTasks();
      let updated = false;
      
      for (const [taskId, taskBacklinks] of backlinks) {
        const task = tasksData.find(t => t.id === taskId);
        if (task && JSON.stringify(task.backlinks) !== JSON.stringify(taskBacklinks)) {
          task.backlinks = taskBacklinks;
          task.updated = new Date().toISOString();
          updated = true;
        }
      }
      
      if (updated) {
        await saveTasks(tasksData);
        console.log(`🔗 Scanned and updated ${backlinks.size} task backlinks`);
      }
    }
  } catch (err) {
    console.error('Error scanning backlinks:', err);
  }
}

// ============================================
// ENHANCED CONFLICT RESOLUTION
// ============================================

async function resolveConflict(localTask, obsidianTask, filepath) {
  const localUpdated = new Date(localTask.updated || 0);
  const obsidianUpdated = new Date(obsidianTask.updated || 0);
  
  // If timestamps are within 5 seconds, treat as conflict
  const timeDiff = Math.abs(localUpdated - obsidianUpdated);
  
  if (timeDiff < 5000) {
    // Create conflict file
    const conflictPath = filepath.replace('.md', `.conflict-${Date.now()}.md`);
    const conflictContent = `---
conflict: true
localTask: ${JSON.stringify(localTask, null, 2)}
obsidianTask: ${JSON.stringify(obsidianTask, null, 2)}
resolved: false
created: ${new Date().toISOString()}
---

# Conflict: ${localTask.title}

This task was modified simultaneously in both the dashboard and Obsidian.

## Local Version (Dashboard)
- Updated: ${localTask.updated}
- Status: ${localTask.status}

## Obsidian Version
- Updated: ${obsidianTask.updated}
- Status: ${obsidianTask.status}

Please resolve this conflict manually.
`;
    await fs.writeFile(conflictPath, conflictContent, 'utf8');
    
    await logEvent({
      type: 'system',
      severity: 'warning',
      title: 'Sync conflict detected',
      description: `Conflict file created: ${path.basename(conflictPath)}`,
      metadata: { localTaskId: localTask.id, conflictPath, timeDiff }
    });
    
    return { resolved: false, conflictPath, strategy: 'manual' };
  }
  
  // Otherwise, most recent wins
  if (obsidianUpdated > localUpdated) {
    return { resolved: true, winner: 'obsidian', strategy: 'timestamp' };
  } else {
    return { resolved: true, winner: 'local', strategy: 'timestamp' };
  }
}

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/outputs', express.static(CONFIG.OUTPUTS_DIR));
app.use('/thumbnails', express.static(CONFIG.THUMBNAILS_DIR));

// Serve React build in production (or fallback to agent-dashboard.html)
const REACT_BUILD_DIR = path.join(CONFIG.BASE_DIR, 'Kanban Agent UI Complete', 'kanban-agent-ui', 'dist');

// Check if React build exists and serve it
const serveReactBuild = async () => {
  try {
    await fs.access(path.join(REACT_BUILD_DIR, 'index.html'));
    return true;
  } catch {
    return false;
  }
};

// Serve React static assets
app.use(express.static(REACT_BUILD_DIR));

// Serve dashboard - React SPA or fallback to legacy HTML
app.get('/', async (req, res) => {
  try {
    const hasReactBuild = await serveReactBuild();
    if (hasReactBuild) {
      const indexPath = path.join(REACT_BUILD_DIR, 'index.html');
      const html = await fs.readFile(indexPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      const dashboardPath = path.join(CONFIG.BASE_DIR, 'agent-dashboard.html');
      const html = await fs.readFile(dashboardPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    }
  } catch (err) {
    res.status(500).send('Dashboard not found');
  }
});

// Legacy dashboard route
app.get('/legacy', async (req, res) => {
  try {
    const dashboardPath = path.join(CONFIG.BASE_DIR, 'agent-dashboard.html');
    const html = await fs.readFile(dashboardPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).send('Legacy dashboard not found');
  }
});

// File upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const today = new Date().toISOString().split('T')[0];
    const dateDir = path.join(CONFIG.OUTPUTS_DIR, today);
    const typeDir = getFileTypeDir(file.mimetype);
    const uploadPath = path.join(dateDir, typeDir);
    
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Accept all files, can add restrictions here
    cb(null, true);
  }
});

function getFileTypeDir(mimetype) {
  if (mimetype.startsWith('image/')) return 'screenshots';
  if (mimetype.startsWith('text/') || mimetype.includes('javascript') || mimetype.includes('json') || mimetype.includes('markdown')) return 'code';
  return 'uploads';
}

// ============================================
// STORAGE LAYER
// ============================================

async function readJson(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function getTasks() {
  const data = await readJson(CONFIG.TASKS_FILE);
  return data?.tasks || [];
}

async function saveTasks(tasks) {
  await writeJson(CONFIG.TASKS_FILE, {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    tasks
  });
}

async function getFiles() {
  const data = await readJson(CONFIG.FILES_FILE);
  return data?.files || [];
}

async function saveFiles(files) {
  await writeJson(CONFIG.FILES_FILE, {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    files
  });
}

async function getEvents() {
  const data = await readJson(CONFIG.EVENTS_FILE);
  return data?.events || [];
}

async function saveEvents(events) {
  await writeJson(CONFIG.EVENTS_FILE, {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    events
  });
}

// ============================================
// REPORTS & ARCHIVE FUNCTIONS
// ============================================

async function getReports() {
  const data = await readJson(CONFIG.REPORTS_FILE);
  return data?.reports || [];
}

async function saveReports(reports) {
  await writeJson(CONFIG.REPORTS_FILE, {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    reports
  });
}

async function createReport(task, completionSummary, prompts = []) {
  const reports = await getReports();
  
  const report = {
    id: `report-${task.id}`,
    taskId: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    tags: task.tags || [],
    agentType: task.agentType,
    planFirst: task.planFirst,
    created: task.created,
    completed: task.completed,
    archivedAt: new Date().toISOString(),
    // Execution summary
    durationMinutes: completionSummary?.durationMinutes || 0,
    cost: completionSummary?.cost || 0,
    stepsCompleted: completionSummary?.stepsCompleted || 0,
    totalSteps: completionSummary?.totalSteps || 0,
    whatWasAccomplished: completionSummary?.whatWasAccomplished || '',
    outputFiles: completionSummary?.outputFiles || [],
    outputLocation: completionSummary?.outputLocation || '',
    finderPath: completionSummary?.finderPath || '',
    urls: completionSummary?.urls || [],
    // Agent prompts used during execution
    agentPrompts: prompts,
    // Keep full copies
    taskSnapshot: { ...task },
    completionSnapshot: { ...completionSummary }
  };
  
  reports.push(report);
  await saveReports(reports);

  await logEvent({
    type: 'task',
    severity: 'info',
    title: 'Report created',
    description: `Report generated for completed task: ${task.title}`,
    metadata: { reportId: report.id, taskId: task.id, promptsCount: prompts.length }
  });

  // Broadcast report creation for real-time UI updates
  broadcastUpdate('report-created', {
    reportId: report.id,
    taskId: task.id,
    title: task.title
  });

  return report;
}

async function getArchivedTasks() {
  const data = await readJson(CONFIG.ARCHIVE_FILE);
  return data?.archived || [];
}

async function saveArchivedTasks(archived) {
  await writeJson(CONFIG.ARCHIVE_FILE, {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    archived
  });
}

async function archiveTask(task) {
  const archived = await getArchivedTasks();

  const archivedTask = {
    ...task,
    archivedAt: new Date().toISOString(),
    originalStatus: task.status
  };

  archived.push(archivedTask);
  await saveArchivedTasks(archived);

  // Remove from active tasks
  const tasks = await getTasks();
  const filtered = tasks.filter(t => t.id !== task.id);
  await saveTasks(filtered);

  await logEvent({
    type: 'task',
    severity: 'info',
    title: 'Task archived',
    description: `Task archived: ${task.title}`,
    metadata: { taskId: task.id }
  });

  // Broadcast archive event for real-time UI updates
  broadcastUpdate('task-archived', {
    taskId: task.id,
    title: task.title
  });

  return archivedTask;
}

async function restoreTaskFromArchive(taskId) {
  const archived = await getArchivedTasks();
  const taskIndex = archived.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    throw new Error('Task not found in archive');
  }
  
  const task = archived[taskIndex];
  delete task.archivedAt;
  delete task.originalStatus;
  task.status = 'backlog';
  task.updated = new Date().toISOString();
  
  // Add back to active tasks
  const tasks = await getTasks();
  tasks.push(task);
  await saveTasks(tasks);
  
  // Remove from archive
  archived.splice(taskIndex, 1);
  await saveArchivedTasks(archived);
  
  await logEvent({
    type: 'task',
    severity: 'info',
    title: 'Task restored',
    description: `Task restored from archive: ${task.title}`,
    metadata: { taskId: task.id }
  });

  // Broadcast restore event for real-time UI updates
  broadcastUpdate('task-restored', {
    taskId: task.id,
    title: task.title
  });

  return task;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() {
  return uuidv4();
}

function calculateSuggestionScore(task, options = {}) {
  const { explicitContext, timeContext, agentContext } = options;
  
  let score = 0;
  
  // 1. Priority Score (35% weight)
  const priorityScore = PRIORITY_WEIGHTS[task.priority] || 25;
  score += (priorityScore / 100) * 35;
  
  // 2. Urgency Score (25% weight)
  let urgencyScore = 10; // No due date
  if (task.dueDate) {
    const now = new Date();
    const due = new Date(task.dueDate);
    const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) urgencyScore = 100; // Overdue
    else if (daysUntilDue === 0) urgencyScore = 90; // Due today
    else if (daysUntilDue === 1) urgencyScore = 70; // Due tomorrow
    else if (daysUntilDue <= 3) urgencyScore = 50; // Due this week
    else if (daysUntilDue <= 7) urgencyScore = 30; // Due soon
    else urgencyScore = 15; // Due later
  }
  score += (urgencyScore / 100) * 25;
  
  // 3. Blocker Score (20% weight)
  // Check if other tasks depend on this one (simulated via backlinks)
  let blockerScore = 0;
  if (task.backlinks && task.backlinks.length > 0) {
    blockerScore = Math.min(task.backlinks.length * 30, 100);
  }
  score += (blockerScore / 100) * 20;
  
  // 4. Context Score (10% weight)
  let contextScore = 50; // Neutral baseline
  
  // Time-based context matching
  if (timeContext) {
    const preferredTypes = timeContext.preferredTaskTypes || [];
    
    // Check if task matches current time of day
    if (task.status === 'today' && 
        (timeContext.context === 'morning' || timeContext.context === 'morning-early')) {
      contextScore += 20;
    }
    if (task.status === 'tomorrow' && 
        (timeContext.context === 'evening' || timeContext.context === 'night')) {
      contextScore += 20;
    }
    
    // Energy-based task matching
    if (task.estimatedMinutes) {
      const highEnergyTasks = ['deep-work', 'creative', 'complex'];
      const lowEnergyTasks = ['admin', 'quick-wins', 'light'];
      
      if (timeContext.energy === 'high' && 
          highEnergyTasks.some(t => preferredTypes.includes(t))) {
        contextScore += 15;
      }
      if ((timeContext.energy === 'low' || timeContext.energy === 'very-low') && 
          lowEnergyTasks.some(t => preferredTypes.includes(t))) {
        contextScore += 15;
      }
    }
  }
  
  // Explicit context override
  if (explicitContext) {
    switch (explicitContext.toLowerCase()) {
      case 'morning':
      case 'deep-work':
        if (task.estimatedMinutes && task.estimatedMinutes >= 60) contextScore += 20;
        break;
      case 'quick-wins':
        if (!task.estimatedMinutes || task.estimatedMinutes <= 30) contextScore += 25;
        break;
      case 'afternoon':
        if (task.status === 'today') contextScore += 15;
        break;
    }
  }
  
  score += (Math.min(contextScore, 100) / 100) * 10;
  
  // 5. Momentum Score (10% weight)
  let momentumScore = 50; // Neutral
  
  // Recently created tasks get a boost
  const created = new Date(task.created);
  const now = new Date();
  const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
  
  if (hoursSinceCreation < 2) {
    momentumScore += 30; // Fresh tasks
  } else if (hoursSinceCreation < 24) {
    momentumScore += 15;
  }
  
  // Auto-extracted tasks from memory/conversation
  if (task.metadata?.autoExtracted) {
    momentumScore += 20; // Recent mentions
  }
  
  // Source context indicates recent relevance
  if (task.sourceContext?.startsWith('memory:') || 
      task.sourceContext?.startsWith('conversation:')) {
    momentumScore += 15;
  }
  
  score += (Math.min(momentumScore, 100) / 100) * 10;
  
  // Status penalty for done tasks
  if (task.status === 'done' || task.status === 'deleted') {
    score = 0;
  }
  
  return Math.min(Math.round(score), 100);
}

function buildTaskMarkdown(task) {
  const frontmatter = {
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    created: task.created,
    updated: task.updated,
    completed: task.completed || null,
    dueDate: task.dueDate || null,
    tags: task.tags || [],
    assignee: task.assignee || 'claw-machine',
    estimatedMinutes: task.estimatedMinutes || null,
    actualMinutes: task.actualMinutes || null,
    files: task.files || [],
    sourceContext: task.sourceContext || null
  };
  
  const content = `# ${task.title}\n\n` +
    (task.description ? `## Description\n\n${task.description}\n\n` : '') +
    (task.tags?.length ? `**Tags:** ${task.tags.map(t => '#' + t).join(' ')}\n\n` : '') +
    (task.dueDate ? `**Due:** ${new Date(task.dueDate).toLocaleDateString()}\n\n` : '') +
    (task.backlinks?.length ? `## Backlinks\n\n${task.backlinks.map(l => `- ${l}`).join('\n')}\n\n` : '');
  
  return matter.stringify(content, frontmatter);
}

async function parseObsidianTask(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = matter(content);
    return {
      ...parsed.data,
      description: parsed.content.replace(/^# .+\n\n/, '').trim()
    };
  } catch (err) {
    console.error(`Error parsing ${filePath}:`, err.message);
    return null;
  }
}

// ============================================
// TASK ENDPOINTS
// ============================================

// GET /tasks - Retrieve all tasks with optional filters
app.get('/api/v1/tasks', async (req, res) => {
  try {
    const { status, priority, tags, search, limit = 100, offset = 0 } = req.query;
    
    let tasks = await getTasks();
    
    // Apply filters
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    if (priority) {
      tasks = tasks.filter(t => t.priority === priority);
    }
    if (tags) {
      const tagList = tags.split(',');
      tasks = tasks.filter(t => tagList.some(tag => t.tags?.includes(tag)));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by status order, then priority, then updated desc
    tasks.sort((a, b) => {
      const statusA = STATUS_ORDER.indexOf(a.status);
      const statusB = STATUS_ORDER.indexOf(b.status);
      if (statusA !== statusB) return statusA - statusB;
      
      const prioA = PRIORITY_WEIGHTS[a.priority] || 0;
      const prioB = PRIORITY_WEIGHTS[b.priority] || 0;
      if (prioA !== prioB) return prioB - prioA;
      
      return new Date(b.updated) - new Date(a.updated);
    });
    
    const total = tasks.length;
    tasks = tasks.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({ tasks, total, offset: parseInt(offset), limit: parseInt(limit) });
  } catch (err) {
    console.error('Error getting tasks:', err);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

// GET /tasks/:id - Get single task
app.get('/api/v1/tasks/:id', async (req, res) => {
  try {
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (err) {
    console.error('Error getting task:', err);
    res.status(500).json({ error: 'Failed to retrieve task' });
  }
});

// POST /tasks - Create new task
app.post('/api/v1/tasks', async (req, res) => {
  try {
    const { title, description, status = 'backlog', dueDate, sourceContext, estimatedMinutes, outputFolder, expectedOutput, agentType, agentId, planFirst, telliEnabled, contextPaths } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const now = new Date().toISOString();
    const task = {
      id: generateId(),
      title: title.trim().substring(0, 200),
      description: description?.trim() || null,
      status,
      created: now,
      updated: now,
      completed: null,
      dueDate: dueDate || null,
      assignee: 'claw-machine',
      estimatedMinutes: estimatedMinutes || null,
      actualMinutes: null,
      files: [],
      obsidianPath: null,
      sourceContext: sourceContext || null,
      outputFolder: outputFolder || '~/Desktop/Claw Creations/outputs',
      expectedOutput: expectedOutput?.trim() || null,
      agentType: agentType || 'auto',
      agentId: agentId || null,
      planFirst: planFirst === true,
      telliEnabled: telliEnabled === true,
      contextPaths: Array.isArray(contextPaths) ? contextPaths : [],
      metadata: {
        createdBy: 'user',
        suggestionScore: null,
        lastSuggested: null
      }
    };
    
    const tasks = await getTasks();
    tasks.push(task);
    await saveTasks(tasks);
    
    // Log event
    await logEvent({
      type: 'task',
      severity: 'info',
      title: 'Task created',
      description: `Created task: ${task.title}`,
      metadata: { taskId: task.id }
    });
    
    // Push to Obsidian
    // await pushToObsidian(task); // DISABLED
    
    res.status(201).json(task);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /tasks/:id - Update task (partial)
app.patch('/api/v1/tasks/:id', async (req, res) => {
  try {
    const tasks = await getTasks();
    const index = tasks.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const allowedFields = ['title', 'description', 'priority', 'status', 'dueDate', 'tags', 'estimatedMinutes', 'actualMinutes', 'files', 'backlinks', 'planFirst', 'agentType', 'agentId', 'telliEnabled', 'outputFolder', 'expectedOutput', 'contextPaths', 'executionStatus', 'completionSummary'];
    const updates = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    // Handle completion
    if (updates.status === 'done' && tasks[index].status !== 'done') {
      updates.completed = new Date().toISOString();
    } else if (updates.status && updates.status !== 'done') {
      updates.completed = null;
    }
    
    tasks[index] = {
      ...tasks[index],
      ...updates,
      updated: new Date().toISOString()
    };
    
    await saveTasks(tasks);
    // await pushToObsidian(tasks[index]); // DISABLED
    
    res.json(tasks[index]);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// POST /tasks/:id/move - Move task to different status
app.post('/api/v1/tasks/:id/move', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!STATUS_ORDER.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const oldStatus = task.status;
    task.status = status;
    task.updated = new Date().toISOString();
    
    if (status === 'done' && oldStatus !== 'done') {
      task.completed = new Date().toISOString();
    } else if (status !== 'done') {
      task.completed = null;
    }
    
    await saveTasks(tasks);
    // await pushToObsidian(task); // DISABLED
    
    await logEvent({
      type: 'task',
      severity: 'info',
      title: 'Task moved',
      description: `Moved "${task.title}" from ${oldStatus} to ${status}`,
      metadata: { taskId: task.id, oldStatus, newStatus: status }
    });
    
    res.json(task);
  } catch (err) {
    console.error('Error moving task:', err);
    res.status(500).json({ error: 'Failed to move task' });
  }
});

// POST /tasks/clear-completed - Move all completed tasks to archive
app.post('/api/v1/tasks/clear-completed', async (req, res) => {
  try {
    const tasks = await getTasks();
    const completedTasks = tasks.filter(t => t.status === 'done' && t.completionSummary);
    
    if (completedTasks.length === 0) {
      return res.json({ success: true, cleared: 0, message: 'No completed tasks to clear' });
    }
    
    // Archive completed tasks
    const archived = [];
    for (const task of completedTasks) {
      try {
        await archiveTask(task);
        archived.push(task.id);
      } catch (err) {
        console.error(`Error archiving task ${task.id}:`, err);
      }
    }
    
    await logEvent({
      type: 'task',
      severity: 'info',
      title: 'Cleared completed tasks',
      description: `Archived ${archived.length} completed tasks`,
      metadata: { cleared: archived.length, taskIds: archived }
    });
    
    res.json({ success: true, cleared: archived.length, taskIds: archived });
  } catch (err) {
    console.error('Error clearing completed tasks:', err);
    res.status(500).json({ error: 'Failed to clear completed tasks' });
  }
});

// DELETE /tasks/:id - Delete task
app.delete('/api/v1/tasks/:id', async (req, res) => {
  try {
    const tasks = await getTasks();
    const index = tasks.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = tasks[index];
    tasks.splice(index, 1);
    await saveTasks(tasks);
    
    // Delete from Obsidian
    if (task.obsidianPath) {
      try {
        await fs.unlink(task.obsidianPath);
      } catch (err) {
        console.warn('Could not delete Obsidian file:', err.message);
      }
    }
    
    await logEvent({
      type: 'task',
      severity: 'info',
      title: 'Task deleted',
      description: `Deleted task: ${task.title}`,
      metadata: { taskId: task.id }
    });
    
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ============================================
// INTELLIGENCE LAYER - CONTEXT DETECTION
// ============================================

function getTimeContext() {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  
  if (hour >= 6 && hour < 9) {
    return {
      context: 'morning-early',
      energy: 'building',
      preferredTaskTypes: ['quick-wins', 'planning', 'email'],
      workStyle: 'starting'
    };
  } else if (hour >= 9 && hour < 12) {
    return {
      context: 'morning',
      energy: 'high',
      preferredTaskTypes: ['deep-work', 'creative', 'complex'],
      workStyle: 'focused'
    };
  } else if (hour >= 12 && hour < 14) {
    return {
      context: 'lunch',
      energy: 'medium',
      preferredTaskTypes: ['light', 'admin', 'review'],
      workStyle: 'transitional'
    };
  } else if (hour >= 14 && hour < 17) {
    return {
      context: 'afternoon',
      energy: 'medium-high',
      preferredTaskTypes: ['implementation', 'meetings', 'collaboration'],
      workStyle: 'productive'
    };
  } else if (hour >= 17 && hour < 20) {
    return {
      context: 'evening',
      energy: 'low-medium',
      preferredTaskTypes: ['wrapping-up', 'admin', 'quick-wins'],
      workStyle: 'closing'
    };
  } else if (hour >= 20 && hour < 23) {
    return {
      context: 'night',
      energy: 'low',
      preferredTaskTypes: ['light', 'review', 'planning'],
      workStyle: 'relaxed'
    };
  } else {
    return {
      context: 'late-night',
      energy: 'very-low',
      preferredTaskTypes: ['minimal', 'review'],
      workStyle: 'wind-down'
    };
  }
}

function getAgentContext() {
  // Try to read agent state from memory
  const memoryDir = path.join(CONFIG.BASE_DIR, 'memory');
  const today = new Date().toISOString().split('T')[0];
  const memoryFile = path.join(memoryDir, `${today}.md`);
  
  return {
    time: getTimeContext(),
    recentTasks: [], // Would be populated from recent history
    activeProject: null, // Would detect from current work
    availableTime: 60, // Default 60 minutes
    isThinking: false // Would detect from agent state
  };
}

// ============================================
// INTELLIGENCE LAYER - MEMORY FILE PARSER
// ============================================

async function parseMemoryFiles() {
  try {
    const memoryDir = path.join(CONFIG.BASE_DIR, 'memory');
    
    try {
      await fs.mkdir(memoryDir, { recursive: true });
    } catch (err) {
      // Directory exists
    }
    
    // Parse today's and yesterday's memory files
    const tasks = [];
    const patterns = [
      { regex: /TODO:\s*(.+)/gi, priority: 'P2', source: 'TODO' },
      { regex: /need to\s+(.+)/gi, priority: 'P1', source: 'need-to' },
      { regex: /should\s+(.+)/gi, priority: 'P2', source: 'should' },
      { regex: /\[ \]\s*(.+)/gi, priority: 'P2', source: 'checkbox' },
      { regex: /remind me to\s+(.+)/gi, priority: 'P2', source: 'reminder' },
      { regex: /action item[:\s]+(.+)/gi, priority: 'P1', source: 'action-item' },
      { regex: /important[:\s]+(.+)/gi, priority: 'P0', source: 'important' }
    ];
    
    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split('T')[0];
      const memFile = path.join(memoryDir, `${dateStr}.md`);
      
      try {
        const content = await fs.readFile(memFile, 'utf8');
        const lines = content.split('\n');
        
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];
          
          for (const pattern of patterns) {
            let match;
            pattern.regex.lastIndex = 0; // Reset regex state
            
            while ((match = pattern.regex.exec(line)) !== null) {
              const title = match[1].trim();
              if (title.length > 3 && title.length < 200) {
                tasks.push({
                  title,
                  priority: pattern.priority,
                  status: 'backlog',
                  sourceContext: `memory:${dateStr}:line:${lineNum + 1}`,
                  description: `Extracted from: ${pattern.source}`,
                  metadata: {
                    autoExtracted: true,
                    extractionPattern: pattern.source
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        // File doesn't exist, skip
      }
    }
    
    return tasks;
  } catch (err) {
    console.error('Error parsing memory files:', err);
    return [];
  }
}

async function parseConversationMentions() {
  // Look for conversation mentions in events/logs
  try {
    const events = await getEvents();
    const mentions = [];
    
    const mentionPatterns = [
      /@claw[- ]?machine[:\s]+(.+)/gi,
      /agent[:\s]+(.+)/gi,
      /can you\s+(.+)/gi,
      /please\s+(.+)/gi
    ];
    
    for (const event of events.slice(0, 100)) {
      if (event.description) {
        for (const pattern of mentionPatterns) {
          let match;
          pattern.lastIndex = 0;
          
          while ((match = pattern.exec(event.description)) !== null) {
            mentions.push({
              title: match[1].trim(),
              sourceContext: `conversation:${event.id}`,
              detectedIn: event.type
            });
          }
        }
      }
    }
    
    return mentions;
  } catch (err) {
    console.error('Error parsing conversation mentions:', err);
    return [];
  }
}

// ============================================
// SUGGESTION ENDPOINTS
// ============================================

app.get('/api/v1/suggestions/next', async (req, res) => {
  try {
    const { context: explicitContext } = req.query;
    const tasks = await getTasks();
    const agentContext = getAgentContext();
    const timeContext = agentContext.time;
    
    // Filter out completed tasks and score each
    const availableTasks = tasks
      .filter(t => t.status !== 'done' && t.status !== 'deleted')
      .map(task => ({
        task,
        score: calculateSuggestionScore(task, {
          explicitContext: explicitContext || timeContext.context,
          timeContext,
          agentContext
        })
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    
    if (availableTasks.length === 0) {
      return res.json({
        task: null,
        score: 0,
        reasoning: 'No tasks available for suggestions',
        alternatives: []
      });
    }
    
    const top = availableTasks[0];
    const alternatives = availableTasks.slice(1, 4).map(item => ({
      task: item.task,
      score: item.score,
      reasoning: getReasoning(item.task, item.score, timeContext)
    }));
    
    res.json({
      task: top.task,
      score: top.score,
      reasoning: getReasoning(top.task, top.score, timeContext),
      alternatives,
      context: {
        time: timeContext.context,
        energy: timeContext.energy,
        workStyle: timeContext.workStyle
      }
    });
  } catch (err) {
    console.error('Error getting suggestion:', err);
    res.status(500).json({ error: 'Failed to get suggestion' });
  }
});

app.get('/api/v1/suggestions/batch', async (req, res) => {
  try {
    const { count = 3, context } = req.query;
    const limit = Math.min(parseInt(count) || 3, 10);
    const agentContext = getAgentContext();
    
    const tasks = await getTasks();
    
    const suggestions = tasks
      .filter(t => t.status !== 'done' && t.status !== 'deleted')
      .map(task => ({
        task,
        score: calculateSuggestionScore(task, {
          explicitContext: context || agentContext.time.context,
          timeContext: agentContext.time,
          agentContext
        })
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({
        task: item.task,
        score: item.score,
        reasoning: getReasoning(item.task, item.score, agentContext.time)
      }));
    
    res.json({
      suggestions,
      generated: new Date().toISOString(),
      context: agentContext.time
    });
  } catch (err) {
    console.error('Error getting batch suggestions:', err);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// POST /suggestions/extract - Extract tasks from memory/conversations
app.post('/api/v1/suggestions/extract', async (req, res) => {
  try {
    const { type = 'all' } = req.body;
    
    const extractedTasks = [];
    
    if (type === 'all' || type === 'memory') {
      const memoryTasks = await parseMemoryFiles();
      extractedTasks.push(...memoryTasks);
    }
    
    if (type === 'all' || type === 'conversation') {
      const conversationMentions = await parseConversationMentions();
      extractedTasks.push(...conversationMentions.map(m => ({
        title: m.title,
        priority: 'P2',
        status: 'backlog',
        sourceContext: m.sourceContext,
        description: `Mentioned in ${m.detectedIn}`,
        metadata: { autoExtracted: true, extractionType: 'conversation' }
      })));
    }
    
    // Deduplicate by title
    const seen = new Set();
    const uniqueTasks = extractedTasks.filter(t => {
      const key = t.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    res.json({
      extracted: uniqueTasks,
      count: uniqueTasks.length,
      types: type === 'all' ? ['memory', 'conversation'] : [type]
    });
  } catch (err) {
    console.error('Error extracting suggestions:', err);
    res.status(500).json({ error: 'Failed to extract suggestions' });
  }
});

// GET /suggestions/context - Get current context
app.get('/api/v1/suggestions/context', async (req, res) => {
  const timeContext = getTimeContext();
  const agentContext = getAgentContext();
  
  res.json({
    time: timeContext,
    agent: agentContext,
    timestamp: new Date().toISOString()
  });
});

function getReasoning(task, score, timeContext = null) {
  const reasons = [];
  
  if (task.priority === 'P0') reasons.push('Critical priority');
  else if (task.priority === 'P1') reasons.push('High priority');
  else if (task.priority === 'P2') reasons.push('Medium priority');
  else reasons.push('Low priority');
  
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const now = new Date();
    const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (days < 0) reasons.push('Overdue');
    else if (days === 0) reasons.push('Due today');
    else if (days === 1) reasons.push('Due tomorrow');
    else if (days <= 7) reasons.push(`Due in ${days} days`);
  }
  
  if (task.status === 'today') reasons.push('Scheduled for today');
  if (task.status === 'tomorrow') reasons.push('Scheduled for tomorrow');
  
  // Context-aware reasoning
  if (timeContext && task.estimatedMinutes) {
    const availableMinutes = timeContext.energy === 'high' ? 120 : 
                            timeContext.energy === 'medium-high' ? 90 : 
                            timeContext.energy === 'medium' ? 60 : 30;
    
    if (task.estimatedMinutes <= availableMinutes) {
      reasons.push(`Fits your ${timeContext.energy} energy level`);
    }
  }
  
  if (task.metadata?.autoExtracted) {
    reasons.push('Auto-detected from memory');
  }
  
  return reasons.join(', ');
}

// ============================================
// EVENT ENDPOINTS
// ============================================

async function logEvent({ type, severity, title, description, metadata = {} }) {
  try {
    const events = await getEvents();
    const event = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      title,
      description,
      metadata
    };
    
    events.unshift(event);
    
    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(1000);
    }
    
    await saveEvents(events);
  } catch (err) {
    console.error('Error logging event:', err);
  }
}

app.get('/api/v1/events', async (req, res) => {
  try {
    const { since, type, limit = 50 } = req.query;
    
    let events = await getEvents();
    
    if (since) {
      events = events.filter(e => e.timestamp > since);
    }
    
    if (type) {
      events = events.filter(e => e.type === type);
    }
    
    events = events.slice(0, parseInt(limit));
    
    res.json({ events, total: events.length });
  } catch (err) {
    console.error('Error getting events:', err);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
});

app.post('/api/v1/events', async (req, res) => {
  try {
    const { type, severity = 'info', title, description, metadata } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    await logEvent({ type, severity, title, description, metadata });
    
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error logging event:', err);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

// ============================================
// REPORTS ENDPOINTS
// ============================================

// GET /reports - List all reports
app.get('/api/v1/reports', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const reports = await getReports();
    
    // Sort by archivedAt desc (most recent first)
    const sorted = reports.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
    
    const paginated = sorted.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      reports: paginated,
      total: reports.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /reports/:reportId - Get single report
app.get('/api/v1/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const reports = await getReports();
    const report = reports.find(r => r.id === reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// DELETE /reports/:reportId - Delete a report
app.delete('/api/v1/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const reports = await getReports();
    const index = reports.findIndex(r => r.id === reportId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    reports.splice(index, 1);
    await saveReports(reports);
    
    res.json({ success: true, deleted: reportId });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// ============================================
// ARCHIVE ENDPOINTS
// ============================================

// GET /archive - List archived tasks
app.get('/api/v1/archive', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const archived = await getArchivedTasks();
    
    // Sort by archivedAt desc (most recent first)
    const sorted = archived.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
    
    const paginated = sorted.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      archived: paginated,
      total: archived.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error fetching archive:', err);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// POST /archive/:taskId/restore - Restore task from archive
app.post('/api/v1/archive/:taskId/restore', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await restoreTaskFromArchive(taskId);
    res.json({ success: true, task });
  } catch (err) {
    console.error('Error restoring task:', err);
    res.status(500).json({ error: err.message || 'Failed to restore task' });
  }
});

// DELETE /archive/:taskId - Permanently delete from archive
app.delete('/api/v1/archive/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const archived = await getArchivedTasks();
    const index = archived.findIndex(t => t.id === taskId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Task not found in archive' });
    }
    
    archived.splice(index, 1);
    await saveArchivedTasks(archived);
    
    res.json({ success: true, deleted: taskId });
  } catch (err) {
    console.error('Error deleting from archive:', err);
    res.status(500).json({ error: 'Failed to delete from archive' });
  }
});

// ============================================
// PLAN ENDPOINTS (Phase 1)
// ============================================

// GET /plans - List all plans with optional filters
app.get('/api/v1/plans', async (req, res) => {
  try {
    const { status, taskId } = req.query;
    
    let plans = await listActivePlans();
    
    if (status) {
      plans = plans.filter(p => p.status === status);
    }
    
    if (taskId) {
      plans = plans.filter(p => p.taskId === taskId);
    }
    
    res.json({ 
      plans, 
      total: plans.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error listing plans:', err);
    res.status(500).json({ error: 'Failed to list plans' });
  }
});

// GET /plans/:taskId - Get specific plan
app.get('/api/v1/plans/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const plan = await readPlan(taskId);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    const context = await loadContext(taskId);
    const log = await readLog(taskId);
    
    res.json({
      taskId,
      plan,
      context,
      log,
      exists: true
    });
  } catch (err) {
    console.error('Error getting plan:', err);
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

// POST /plans - Create plan manually
app.post('/api/v1/plans', async (req, res) => {
  try {
    const { taskId, content, context: contextData } = req.body;
    
    if (!taskId || !content) {
      return res.status(400).json({ error: 'taskId and content are required' });
    }
    
    const planPath = await writePlan(taskId, content);
    
    if (contextData) {
      await saveContext(taskId, contextData);
    }
    
    await logEvent({
      type: 'system',
      severity: 'info',
      title: 'Plan created',
      description: `Plan created for task ${taskId}`,
      metadata: { taskId, planPath }
    });
    
    res.status(201).json({
      success: true,
      taskId,
      planPath,
      created: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error creating plan:', err);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// PUT /plans/:taskId/approve - Approve plan
app.put('/api/v1/plans/:taskId/approve', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!await planExists(taskId)) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    const plan = await readPlan(taskId);
    plan.metadata.status = 'approved';
    plan.metadata.approvedAt = new Date().toISOString();
    
    // Rewrite plan with updated metadata
    const updatedContent = matter.stringify(plan.content, plan.metadata);
    await writePlan(taskId, updatedContent);
    
    await appendLog(taskId, {
      level: 'success',
      message: 'Plan approved',
      details: 'Plan approved and ready for execution'
    });
    
    await logEvent({
      type: 'system',
      severity: 'info',
      title: 'Plan approved',
      description: `Plan for task ${taskId} approved`,
      metadata: { taskId }
    });
    
    res.json({ success: true, taskId, status: 'approved' });
  } catch (err) {
    console.error('Error approving plan:', err);
    res.status(500).json({ error: 'Failed to approve plan' });
  }
});

// PUT /plans/:taskId/complete - Mark complete and archive
app.put('/api/v1/plans/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { result, outputLocation } = req.body;
    
    if (!await planExists(taskId)) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    await appendLog(taskId, {
      level: 'success',
      message: 'Execution completed',
      details: result || 'Task execution finished',
      output: outputLocation
    });
    
    const archiveDir = await archivePlan(taskId, {
      result,
      outputLocation,
      completedAt: new Date().toISOString()
    });
    
    await logEvent({
      type: 'system',
      severity: 'info',
      title: 'Plan archived',
      description: `Plan for task ${taskId} archived`,
      metadata: { taskId, archiveDir }
    });
    
    res.json({ success: true, taskId, archiveDir });
  } catch (err) {
    console.error('Error completing plan:', err);
    res.status(500).json({ error: 'Failed to complete plan' });
  }
});

// PUT /plans/:taskId/progress - Update step progress
app.put('/api/v1/plans/:taskId/progress', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { stepNumber, status, result } = req.body;
    
    if (!await planExists(taskId)) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    if (status === 'completed') {
      await logStepComplete(taskId, stepNumber, result);
    } else if (status === 'started') {
      await appendLog(taskId, {
        level: 'info',
        stepNumber,
        message: `Step ${stepNumber} started`,
        details: result
      });
    } else if (status === 'error') {
      await logError(taskId, result, false);
    }
    
    res.json({ success: true, taskId, stepNumber, status });
  } catch (err) {
    console.error('Error updating plan progress:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// GET /plans/:taskId/exists - Check if plan exists
app.get('/api/v1/plans/:taskId/exists', async (req, res) => {
  try {
    const { taskId } = req.params;
    const exists = await planExists(taskId);
    res.json({ taskId, exists });
  } catch (err) {
    console.error('Error checking plan existence:', err);
    res.status(500).json({ error: 'Failed to check plan' });
  }
});

// POST /plans/:taskId/log - Append to execution log
app.post('/api/v1/plans/:taskId/log', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { level, message, details, output, stepNumber, agent } = req.body;
    
    const logPath = await appendLog(taskId, {
      level: level || 'info',
      message,
      details,
      output,
      stepNumber,
      agent
    });
    
    res.json({ success: true, taskId, logPath });
  } catch (err) {
    console.error('Error appending to log:', err);
    res.status(500).json({ error: 'Failed to append log' });
  }
});

// GET /plans/:taskId/log - Read execution log
app.get('/api/v1/plans/:taskId/log', async (req, res) => {
  try {
    const { taskId } = req.params;
    const log = await readLog(taskId);
    
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }
    
    res.json({ taskId, log });
  } catch (err) {
    console.error('Error reading log:', err);
    res.status(500).json({ error: 'Failed to read log' });
  }
});

// DELETE /plans/:taskId - Delete plan
app.delete('/api/v1/plans/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!await planExists(taskId)) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    const planDir = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId);
    const files = await fs.readdir(planDir);
    
    for (const file of files) {
      await fs.unlink(path.join(planDir, file));
    }
    await fs.rmdir(planDir);
    
    await logEvent({
      type: 'system',
      severity: 'info',
      title: 'Plan deleted',
      description: `Plan for task ${taskId} deleted`,
      metadata: { taskId }
    });
    
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting plan:', err);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// ============================================
// FILE ENDPOINTS
// ============================================

async function calculateFileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

app.post('/api/v1/files/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { taskId, tags } = req.body;
    
    // Calculate hash for deduplication
    const hash = await calculateFileHash(req.file.path);
    
    // Check for duplicate
    const files = await getFiles();
    const existingFile = files.find(f => f.hash === hash);
    
    let file;
    let isDuplicate = false;
    
    if (existingFile) {
      // Link to task if specified
      isDuplicate = true;
      file = existingFile;
      
      if (taskId) {
        if (!file.taskIds.includes(taskId)) {
          file.taskIds.push(taskId);
          await saveFiles(files);
        }
      }
    } else {
      // Create new file record
      file = {
        id: generateId(),
        filename: req.file.originalname,
        filepath: path.relative(path.join(process.env.HOME, 'Desktop/Claw Creations'), req.file.path),
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploaded: new Date().toISOString(),
        taskIds: taskId ? [taskId] : [],
        thumbnail: null,
        hash,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        metadata: {
          width: null,
          height: null,
          generatedBy: null
        }
      };
      
      // Check if image and generate thumbnail
      if (req.file.mimetype.startsWith('image/')) {
        try {
          const sharp = require('sharp');
          const thumbnailPath = path.join(CONFIG.THUMBNAILS_DIR, `${file.id}.jpg`);
          await sharp(req.file.path)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
          
          file.thumbnail = path.relative(path.join(process.env.HOME, 'Desktop/Claw Creations'), thumbnailPath);
          
          // Get dimensions
          const metadata = await sharp(req.file.path).metadata();
          file.metadata.width = metadata.width;
          file.metadata.height = metadata.height;
        } catch (err) {
          console.warn('Could not generate thumbnail:', err.message);
        }
      }
      
      files.push(file);
      await saveFiles(files);
    }
    
    // Link to task if specified and not duplicate
    if (taskId && !isDuplicate) {
      const tasks = await getTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        if (!task.files.includes(file.id)) {
          task.files.push(file.id);
          await saveTasks(tasks);
          // await pushToObsidian(task); // DISABLED
        }
      }
    }
    
    await logEvent({
      type: 'system',
      severity: 'info',
      title: isDuplicate ? 'File duplicate detected' : 'File uploaded',
      description: `${req.file.originalname}${isDuplicate ? ' (duplicate, linked)' : ''}`,
      metadata: { fileId: file.id, taskId, duplicate: isDuplicate }
    });
    
    res.status(201).json({
      file,
      url: `/api/v1/files/${file.id}/view`,
      duplicate: isDuplicate
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.get('/api/v1/files/:id/view', async (req, res) => {
  try {
    const files = await getFiles();
    const file = files.find(f => f.id === req.params.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = path.join(process.env.HOME, 'Desktop/Claw Creations', file.filepath);
    res.sendFile(filePath);
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/api/v1/files', async (req, res) => {
  try {
    const { taskId, tags, mimetype } = req.query;
    
    let files = await getFiles();
    
    if (taskId) {
      files = files.filter(f => f.taskIds.includes(taskId));
    }
    
    if (tags) {
      const tagList = tags.split(',');
      files = files.filter(f => tagList.some(tag => f.tags?.includes(tag)));
    }
    
    if (mimetype) {
      files = files.filter(f => f.mimetype.startsWith(mimetype));
    }
    
    res.json({ files, total: files.length });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// GET /files/:id - Get file metadata
app.get('/api/v1/files/:id', async (req, res) => {
  try {
    const files = await getFiles();
    const file = files.find(f => f.id === req.params.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(file);
  } catch (err) {
    console.error('Error getting file:', err);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// POST /files/link - Link file to task
app.post('/api/v1/files/link', async (req, res) => {
  try {
    const { fileId, taskId } = req.body;
    
    if (!fileId || !taskId) {
      return res.status(400).json({ error: 'fileId and taskId required' });
    }
    
    const files = await getFiles();
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Add task to file's taskIds
    if (!file.taskIds.includes(taskId)) {
      file.taskIds.push(taskId);
      await saveFiles(files);
    }
    
    // Add file to task's files
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      if (!task.files.includes(fileId)) {
        task.files.push(fileId);
        await saveTasks(tasks);
        // await pushToObsidian(task); // DISABLED
      }
    }
    
    await logEvent({
      type: 'system',
      severity: 'info',
      title: 'File linked to task',
      description: `${file.filename} linked to task`,
      metadata: { fileId, taskId }
    });
    
    res.json({ success: true, file, task });
  } catch (err) {
    console.error('Error linking file:', err);
    res.status(500).json({ error: 'Failed to link file' });
  }
});

// POST /files/auto-link - Auto-link from agent output (webhook endpoint)
app.post('/api/v1/files/auto-link', async (req, res) => {
  try {
    const { filepath, filename, taskId, sourceContext, tags, generatedBy } = req.body;
    
    if (!filepath || !filename) {
      return res.status(400).json({ error: 'filepath and filename required' });
    }
    
    // Resolve full path
    const fullPath = filepath.startsWith('/') ? filepath : 
      path.join(process.env.HOME, 'Desktop/Claw Creations', filepath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Calculate hash
    const hash = await calculateFileHash(fullPath);
    const stats = await fs.stat(fullPath);
    
    // Determine mimetype
    const ext = path.extname(filename).toLowerCase();
    const mimetype = getMimeType(ext);
    
    // Check for duplicate
    const files = await getFiles();
    const existingFile = files.find(f => f.hash === hash);
    
    let file;
    
    if (existingFile) {
      file = existingFile;
      // Link to task if specified
      if (taskId && !file.taskIds.includes(taskId)) {
        file.taskIds.push(taskId);
        await saveFiles(files);
      }
    } else {
      // Determine category for file organization
      const category = determineFileCategory(filename, mimetype);
      const today = new Date().toISOString().split('T')[0];
      const destDir = path.join(CONFIG.OUTPUTS_DIR, today, category);
      await fs.mkdir(destDir, { recursive: true });
      
      // Copy file to outputs
      const destPath = path.join(destDir, `${Date.now()}-${filename}`);
      await fs.copyFile(fullPath, destPath);
      
      // Create file record
      file = {
        id: generateId(),
        filename,
        filepath: path.relative(path.join(process.env.HOME, 'Desktop/Claw Creations'), destPath),
        mimetype,
        size: stats.size,
        uploaded: new Date().toISOString(),
        taskIds: taskId ? [taskId] : [],
        thumbnail: null,
        hash,
        tags: tags || [],
        metadata: {
          width: null,
          height: null,
          generatedBy: generatedBy || 'agent'
        }
      };
      
      // Generate thumbnail for images
      if (mimetype.startsWith('image/')) {
        try {
          const sharp = require('sharp');
          const thumbnailPath = path.join(CONFIG.THUMBNAILS_DIR, `${file.id}.jpg`);
          await sharp(destPath).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbnailPath);
          file.thumbnail = path.relative(path.join(process.env.HOME, 'Desktop/Claw Creations'), thumbnailPath);
          const metadata = await sharp(destPath).metadata();
          file.metadata.width = metadata.width;
          file.metadata.height = metadata.height;
        } catch (err) {
          console.warn('Could not generate thumbnail:', err.message);
        }
      }
      
      files.push(file);
      await saveFiles(files);
    }
    
    // Link to task
    if (taskId) {
      const tasks = await getTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task && !task.files.includes(file.id)) {
        task.files.push(file.id);
        await saveTasks(tasks);
        // await pushToObsidian(task); // DISABLED
      }
    }
    
    await logEvent({
      type: 'system',
      severity: 'info',
      title: 'File auto-linked',
      description: `${filename}${taskId ? ' linked to task' : ''}`,
      metadata: { fileId: file.id, taskId, sourceContext, generatedBy }
    });
    
    res.status(201).json({
      success: true,
      file,
      url: `/api/v1/files/${file.id}/view`
    });
  } catch (err) {
    console.error('Error auto-linking file:', err);
    res.status(500).json({ error: 'Failed to auto-link file' });
  }
});

// DELETE /files/:id - Delete file
app.delete('/api/v1/files/:id', async (req, res) => {
  try {
    const files = await getFiles();
    const index = files.findIndex(f => f.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = files[index];
    
    // Delete actual file
    const fullPath = path.join(process.env.HOME, 'Desktop/Claw Creations', file.filepath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      console.warn('Could not delete file:', err.message);
    }
    
    // Delete thumbnail if exists
    if (file.thumbnail) {
      try {
        const thumbPath = path.join(process.env.HOME, 'Desktop/Claw Creations', file.thumbnail);
        await fs.unlink(thumbPath);
      } catch (err) {
        // Ignore
      }
    }
    
    // Remove from tasks
    const tasks = await getTasks();
    for (const task of tasks) {
      const fileIndex = task.files.indexOf(file.id);
      if (fileIndex !== -1) {
        task.files.splice(fileIndex, 1);
        await saveTasks(tasks);
        // await pushToObsidian(task); // DISABLED
      }
    }
    
    files.splice(index, 1);
    await saveFiles(files);
    
    await logEvent({
      type: 'system',
      severity: 'info',
      title: 'File deleted',
      description: `${file.filename}`,
      metadata: { fileId: file.id }
    });
    
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Helper: Get MIME type from extension
function getMimeType(ext) {
  const types = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.txt': 'text/plain',
    '.js': 'application/javascript', '.json': 'application/json',
    '.html': 'text/html', '.css': 'text/css',
    '.md': 'text/markdown', '.py': 'text/x-python',
    '.sh': 'application/x-sh', '.zsh': 'application/x-sh'
  };
  return types[ext] || 'application/octet-stream';
}

// Helper: Determine file category
function determineFileCategory(filename, mimetype) {
  if (mimetype.startsWith('image/')) return 'screenshots';
  if (mimetype.startsWith('text/') || mimetype.includes('javascript') || 
      mimetype.includes('json') || mimetype.includes('markdown')) return 'code';
  if (mimetype.includes('pdf')) return 'artifacts';
  return 'uploads';
}

// ============================================
// SEARCH ENDPOINTS
// ============================================

app.get('/api/v1/search', async (req, res) => {
  try {
    const { q, scope = 'tasks,events,files', limit = 10 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    const searchLower = q.toLowerCase();
    const results = {};
    const startTime = Date.now();
    const perScopeLimit = parseInt(limit);
    
    const scopes = scope.split(',').map(s => s.trim());
    
    if (scopes.includes('tasks')) {
      const tasks = await getTasks();
      results.tasks = tasks
        .filter(t => 
          t.title.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower) ||
          t.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        )
        .slice(0, perScopeLimit);
    }
    
    if (scopes.includes('events')) {
      const events = await getEvents();
      results.events = events
        .filter(e => 
          e.title.toLowerCase().includes(searchLower) ||
          e.description?.toLowerCase().includes(searchLower)
        )
        .slice(0, perScopeLimit);
    }
    
    if (scopes.includes('files')) {
      const files = await getFiles();
      results.files = files
        .filter(f => 
          f.filename.toLowerCase().includes(searchLower) ||
          f.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        )
        .slice(0, perScopeLimit);
    }
    
    res.json({
      results,
      query: q,
      took: Date.now() - startTime
    });
  } catch (err) {
    console.error('Error searching:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============================================
// OBSIDIAN SYNC ENDPOINTS
// ============================================

async function pushToObsidian(task, broadcast = true) {
  try {
    const statusDir = path.join(CONFIG.OBSIDIAN_VAULT, task.status);
    await fs.mkdir(statusDir, { recursive: true });
    
    const fileName = `${task.id}.md`;
    const filePath = path.join(statusDir, fileName);
    const markdown = buildTaskMarkdown(task);
    
    await fs.writeFile(filePath, markdown, 'utf8');
    
    // Update task with obsidian path
    task.obsidianPath = filePath;
    
    if (broadcast) {
      broadcastUpdate('task-pushed', { taskId: task.id, status: task.status });
    }
    
    return filePath;
  } catch (err) {
    console.error('Error pushing to Obsidian:', err);
    throw err;
  }
}

async function pushAllToObsidian() {
  try {
    const tasks = await getTasks();
    const filesWritten = [];
    
    for (const task of tasks) {
      if (task.status !== 'deleted') {
        // await pushToObsidian(task, false); // DISABLED
        filesWritten.push(task.obsidianPath);
      }
    }
    
    broadcastUpdate('all-pushed', { count: filesWritten.length });
    
    return filesWritten;
  } catch (err) {
    console.error('Error pushing all to Obsidian:', err);
    throw err;
  }
}

async function pullFromObsidian() {
  try {
    const tasks = await getTasks();
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const changes = { synced: 0, created: 0, updated: 0, deleted: 0, conflicts: [] };
    
    // Track which task IDs exist in Obsidian
    const obsidianTaskIds = new Set();
    
    for (const status of STATUS_ORDER) {
      const statusDir = path.join(CONFIG.OBSIDIAN_VAULT, status);
      
      try {
        const files = await fs.readdir(statusDir);
        
        for (const file of files) {
          if (!file.endsWith('.md') || file.startsWith('conflict-')) continue;
          
          const filePath = path.join(statusDir, file);
          const obsidianTask = await parseObsidianTask(filePath);
          
          if (!obsidianTask || !obsidianTask.id) continue;
          
          obsidianTaskIds.add(obsidianTask.id);
          const existingTask = taskMap.get(obsidianTask.id);
          
          if (existingTask) {
            // Check for conflicts
            const obsidianUpdated = new Date(obsidianTask.updated || 0);
            const taskUpdated = new Date(existingTask.updated || 0);
            
            if (obsidianUpdated > taskUpdated) {
              // Check if local was modified recently too
              const conflict = await resolveConflict(existingTask, obsidianTask, filePath);
              
              if (conflict.resolved) {
                if (conflict.winner === 'obsidian') {
                  Object.assign(existingTask, {
                    ...obsidianTask,
                    updated: new Date().toISOString(),
                    status
                  });
                  changes.updated++;
                }
                // If winner is local, we keep the local version
              } else {
                // Manual conflict resolution needed
                changes.conflicts.push({
                  taskId: existingTask.id,
                  taskTitle: existingTask.title,
                  conflictPath: conflict.conflictPath
                });
              }
            }
            changes.synced++;
          } else {
            // New task from Obsidian
            const newTask = {
              ...obsidianTask,
              status,
              obsidianPath: filePath,
              updated: new Date().toISOString()
            };
            tasks.push(newTask);
            taskMap.set(newTask.id, newTask);
            changes.created++;
          }
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.warn(`Error reading ${statusDir}:`, err.message);
        }
      }
    }
    
    // Check for deleted tasks
    for (const [taskId, task] of taskMap) {
      if (!obsidianTaskIds.has(taskId) && task.status !== 'deleted') {
        // Task was deleted in Obsidian
        task.status = 'deleted';
        task.updated = new Date().toISOString();
        changes.deleted++;
      }
    }
    
    await saveTasks(tasks);
    
    // Scan for backlinks after sync
    await scanBacklinks();
    
    // Broadcast update
    broadcastUpdate('tasks-refreshed', { 
      changes, 
      timestamp: new Date().toISOString() 
    });
    
    return changes;
  } catch (err) {
    console.error('Error pulling from Obsidian:', err);
    throw err;
  }
}

app.post('/api/v1/sync/obsidian/pull', async (req, res) => {
  // DISABLED: Obsidian sync disabled to prevent state conflicts
  res.json({ synced: 0, disabled: true, message: 'Obsidian sync is disabled' });
});

app.post('/api/v1/sync/obsidian/push', async (req, res) => {
  try {
    const filesWritten = await pushAllToObsidian();
    
    await logEvent({
      type: 'system',
      severity: 'info',
      title: 'Obsidian sync push',
      description: `Pushed ${filesWritten.length} tasks to Obsidian`,
      metadata: { filesWritten: filesWritten.length }
    });
    
    res.json({
      synced: filesWritten.length,
      filesWritten
    });
  } catch (err) {
    console.error('Error pushing to Obsidian:', err);
    res.status(500).json({ error: 'Failed to push to Obsidian' });
  }
});

app.get('/api/v1/sync/status', async (req, res) => {
  try {
    const lastEvents = await getEvents();
    const obsidianEvents = lastEvents
      .filter(e => e.title?.includes('Obsidian') || e.title?.includes('sync'))
      .slice(0, 5);
    
    // Check for conflict files
    let conflicts = [];
    try {
      const statusDirs = STATUS_ORDER.map(s => path.join(CONFIG.OBSIDIAN_VAULT, s));
      for (const dir of statusDirs) {
        const files = await fs.readdir(dir);
        const conflictFiles = files.filter(f => f.startsWith('conflict-'));
        for (const cf of conflictFiles) {
          conflicts.push({
            file: cf,
            path: path.join(dir, cf),
            detected: (await fs.stat(path.join(dir, cf))).mtime
          });
        }
      }
    } catch (err) {
      // Directory might not exist
    }
    
    // Check watcher status
    const watcherActive = obsidianWatcher !== null;
    
    res.json({
      lastPull: obsidianEvents.find(e => e.title.includes('pull') || e.title.includes('created') || e.title.includes('updated'))?.timestamp || null,
      lastPush: obsidianEvents.find(e => e.title.includes('push') || e.title.includes('modified simultaneously'))?.timestamp || null,
      watcherActive,
      pendingChanges: 0,
      conflicts,
      obsidianVault: CONFIG.OBSIDIAN_VAULT
    });
  } catch (err) {
    console.error('Error getting sync status:', err);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// GET /sync/dataview - Get DataviewJS queries for Obsidian
app.get('/api/v1/sync/dataview', async (req, res) => {
  try {
    const tasks = await getTasks();
    const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'deleted');
    
    const overdueTasks = activeTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    });
    
    const todayTasks = activeTasks.filter(t => t.status === 'today');
    const tomorrowTasks = activeTasks.filter(t => t.status === 'tomorrow');
    const backlogTasks = activeTasks.filter(t => t.status === 'backlog');
    
    res.json({
      dataviewQueries: {
        allTasks: `\`\`\`dataview
TABLE priority, status, dueDate
FROM "Tasks"
WHERE status != "deleted"
SORT priority ASC, dueDate ASC
\`\`\``,
        
        todayTasks: `\`\`\`dataview
TABLE priority, dueDate, tags
FROM "Tasks/today"
SORT priority ASC
\`\`\``,
        
        overdueTasks: `\`\`\`dataview
TABLE priority, dueDate, daysOverdue
FROM "Tasks"
WHERE dueDate < date(today) AND status != "done"
SORT priority ASC
\`\`\``,
        
        byPriority: `\`\`\`dataview
TABLE status, length(rows) as count
FROM "Tasks"
WHERE status != "done"
GROUP BY priority
\`\`\``,
        
        byProject: `\`\`\`dataview
TABLE status, dueDate
FROM "Tasks"
WHERE contains(tags, "project")
SORT dueDate ASC
\`\`\``
      },
      statistics: {
        total: tasks.length,
        active: activeTasks.length,
        completed: tasks.filter(t => t.status === 'done').length,
        overdue: overdueTasks.length,
        byStatus: {
          today: todayTasks.length,
          tomorrow: tomorrowTasks.length,
          backlog: backlogTasks.length
        }
      }
    });
  } catch (err) {
    console.error('Error getting Dataview queries:', err);
    res.status(500).json({ error: 'Failed to get Dataview queries' });
  }
});

// POST /sync/watcher/toggle - Toggle file watcher
app.post('/api/v1/sync/watcher/toggle', async (req, res) => {
  try {
    const { action } = req.body;
    
    if (action === 'start') {
      if (obsidianWatcher) {
        res.json({ active: true, message: 'Watcher already active' });
      } else {
        await initFileWatcher();
        res.json({ active: true, message: 'File watcher started' });
      }
    } else if (action === 'stop') {
      if (obsidianWatcher) {
        obsidianWatcher.close();
        obsidianWatcher = null;
        res.json({ active: false, message: 'File watcher stopped' });
      } else {
        res.json({ active: false, message: 'Watcher already stopped' });
      }
    } else {
      res.json({ active: obsidianWatcher !== null });
    }
  } catch (err) {
    console.error('Error toggling watcher:', err);
    res.status(500).json({ error: 'Failed to toggle watcher' });
  }
});

// ============================================
// PHASE 4: EXECUTION INTEGRATION
// ============================================

// In-memory session store (with persistence)
const activeSessions = new Map();
const executionSessions = new Map(); // Phase 4: Track execution state

// Past sessions archive for history and cost tracking
const pastSessions = [];

// Execution queue (persistent)
const executionQueue = [];

// ============================================
// SESSION & QUEUE PERSISTENCE HELPERS
// ============================================

async function persistActiveSessions() {
  try {
    const sessions = Array.from(activeSessions.entries());
    await writeJson(CONFIG.ACTIVE_SESSIONS_FILE, { version: '1.0', lastUpdated: new Date().toISOString(), sessions });
  } catch (err) {
    console.warn('Failed to persist active sessions:', err.message);
  }
}

async function restoreActiveSessions() {
  try {
    const data = await readJson(CONFIG.ACTIVE_SESSIONS_FILE);
    const sessions = data?.sessions || [];
    for (const [id, session] of sessions) {
      activeSessions.set(id, session);
    }
    if (sessions.length) {
      console.log(`🔁 Restored ${sessions.length} active sessions`);
    }
  } catch (err) {
    console.log('No active sessions to restore');
  }
}

async function persistPastSessions() {
  try {
    await writeJson(CONFIG.PAST_SESSIONS_FILE, { version: '1.0', lastUpdated: new Date().toISOString(), sessions: pastSessions });
  } catch (err) {
    console.warn('Failed to persist past sessions:', err.message);
  }
}

async function restorePastSessions() {
  try {
    const data = await readJson(CONFIG.PAST_SESSIONS_FILE);
    const sessions = data?.sessions || [];
    pastSessions.push(...sessions);
    if (sessions.length) {
      console.log(`🔁 Restored ${sessions.length} past sessions`);
    }
  } catch (err) {
    console.log('No past sessions to restore');
  }
}

async function persistExecutionQueue() {
  try {
    await writeJson(CONFIG.EXECUTION_QUEUE_FILE, { version: '1.0', lastUpdated: new Date().toISOString(), jobs: executionQueue });
  } catch (err) {
    console.warn('Failed to persist execution queue:', err.message);
  }
}

async function restoreExecutionQueue() {
  try {
    const data = await readJson(CONFIG.EXECUTION_QUEUE_FILE);
    const jobs = data?.jobs || [];
    executionQueue.push(...jobs);
    if (jobs.length) {
      console.log(`🔁 Restored ${jobs.length} queued executions`);
    }
  } catch (err) {
    console.log('No execution queue to restore');
  }
}

async function enqueueExecution(taskId, task) {
  const job = {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    queuedAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
    maxAttempts: 3
  };
  executionQueue.push(job);
  await persistExecutionQueue();
  processExecutionQueue().catch(err => console.error('Queue processing failed:', err));
  return job;
}

async function processExecutionQueue() {
  const running = executionQueue.find(j => j.status === 'running');
  if (running) return;

  const nextJob = executionQueue.find(j => j.status === 'pending');
  if (!nextJob) return;

  nextJob.status = 'running';
  nextJob.startedAt = new Date().toISOString();
  nextJob.attempts += 1;
  await persistExecutionQueue();

  try {
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === nextJob.taskId);
    if (!task) throw new Error('Task not found for queued execution');

    const result = await executePlan(nextJob.taskId, task);

    nextJob.status = 'completed';
    nextJob.completedAt = new Date().toISOString();
    nextJob.execId = result.execId;
    nextJob.sessionId = result.sessionId;
  } catch (err) {
    nextJob.error = err.message;
    if (nextJob.attempts < nextJob.maxAttempts) {
      nextJob.status = 'pending';
    } else {
      nextJob.status = 'failed';
    }
  }

  await persistExecutionQueue();

  // Continue processing if more jobs remain
  processExecutionQueue().catch(queueErr => console.error('Queue processing failed:', queueErr));
}

async function reconcileTaskStates() {
  console.log('🔄 Reconciling task states...');

  const tasks = await getTasks();
  let fixedCount = 0;

  for (const task of tasks) {
    if (task.executionStatus === 'planning') {
      const planReady = await planExists(task.id);
      const hasSession = Array.from(activeSessions.values()).some(s => s.taskId === task.id);

      if (planReady && !hasSession) {
        task.executionStatus = 'plan-ready';
        fixedCount += 1;
      }
    }

    if (task.executionStatus === 'executing') {
      const hasSession = Array.from(activeSessions.values()).some(s => s.taskId === task.id);
      if (!hasSession) {
        task.executionStatus = 'error';
        task.executionError = 'Execution interrupted by server restart';
        fixedCount += 1;
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

/**
 * Archive a completed session for history
 */
async function archiveSession(session) {
  const completedSession = {
    ...session,
    completedAt: new Date().toISOString(),
    durationMs: session.startedAt ? Date.now() - new Date(session.startedAt).getTime() : 0
  };
  
  // Calculate duration in minutes (if not already set)
  if (!completedSession.durationMinutes) {
    completedSession.durationMinutes = Math.round(completedSession.durationMs / 60000 * 10) / 10;
  }
  
  // Estimate tokens if not already tracked
  if (!completedSession.tokensUsed) {
    const tokensPerMinute = 1000; // rough estimate
    completedSession.tokensUsed = Math.round(completedSession.durationMinutes * tokensPerMinute);
  }
  
  // Calculate cost (Kimi K2.5: ~$0.0005 per 1K tokens = $0.0000005 per token)
  if (!completedSession.estimatedCost) {
    completedSession.estimatedCost = parseFloat((completedSession.tokensUsed * 0.0000005).toFixed(3));
  }
  
  pastSessions.unshift(completedSession); // Add to beginning
  
  // Keep only last 50 sessions
  if (pastSessions.length > 50) {
    pastSessions.pop();
  }
  
  await persistPastSessions();
  
  console.log(`📊 Session archived: ${session.id} (${completedSession.durationMinutes}min, $${completedSession.estimatedCost})`);
}

/**
 * Parse plan.md and extract execution steps
 */
function parsePlanSteps(content) {
  const steps = [];
  const lines = content.split('\n');
  let currentStep = null;
  
  for (const line of lines) {
    const stepMatch = line.match(/### Step (\d+):\s*(.+)/);
    if (stepMatch) {
      if (currentStep) steps.push(currentStep);
      currentStep = {
        number: parseInt(stepMatch[1]),
        title: stepMatch[2].trim(),
        agent: 'auto',
        instructions: '',
        status: 'pending'
      };
    } else if (currentStep && line.includes('**Agent:**')) {
      currentStep.agent = line.split('**Agent:**')[1].trim().toLowerCase().replace(/\s+/g, '-');
    } else if (currentStep && line.includes('**Time:**')) {
      const timeMatch = line.match(/(\d+)\s*minutes?/);
      if (timeMatch) currentStep.estimatedMinutes = parseInt(timeMatch[1]);
    } else if (currentStep && !line.startsWith('#') && line.trim()) {
      currentStep.instructions += line + '\n';
    }
  }
  if (currentStep) steps.push(currentStep);
  return steps;
}

/**
 * Get display model name from model ID
 */
function getModelDisplayName(modelId) {
  if (!modelId) return 'Default';
  // Extract the last segment for display: "anthropic/claude-sonnet-4-5" -> "claude-sonnet-4-5"
  const parts = modelId.split('/');
  return parts[parts.length - 1];
}

/**
 * Look up the agent profile for a task and return its settings
 */
async function getAgentProfileForTask(taskId) {
  const tasks = await getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.agentId) return null;

  const agents = await loadAgents();
  return agents.find(a => a.id === task.agentId) || null;
}

/**
 * Get the default model from openclaw.json config
 */
function getDefaultModel() {
  try {
    const configPath = path.join(process.env.HOME, '.openclaw', 'openclaw.json');
    const rawFs = require('fs');
    if (rawFs.existsSync(configPath)) {
      const config = JSON.parse(rawFs.readFileSync(configPath, 'utf8'));
      if (config?.agents?.defaults?.model?.primary) {
        return config.agents.defaults.model.primary;
      }
    }
  } catch (err) {
    console.warn('Could not read default model from openclaw.json:', err.message);
  }
  return 'anthropic/claude-sonnet-4-5';
}

/**
 * Execute a step using a real agent via sessions_spawn
 */
async function executeStepWithAgent(taskId, step, allSteps, execId) {
  const tasks = await getTasks();
  const task = tasks.find(t => t.id === taskId);

  // Look up agent profile for this task
  const agentProfile = await getAgentProfileForTask(taskId);
  const agentModel = agentProfile?.model || getDefaultModel();
  const agentTimeout = agentProfile?.sandbox?.timeout || 300;
  const agentSystemPrompt = agentProfile?.prompt || '';

  // Get output folder from task or use default
  const outputFolder = task.outputFolder || '~/Desktop/Claw Creations/outputs';
  const expectedOutput = task.expectedOutput ? `\n**Expected Deliverable:** ${task.expectedOutput}` : '';

  // Build context paths section
  const contextPathsSection = (task.contextPaths && task.contextPaths.length > 0)
    ? `\n**Context Files/Folders (read these for reference):**\n${task.contextPaths.map(p => `- ${p}`).join('\n')}`
    : '';

  // Build agent identity section
  const agentIdentity = agentProfile
    ? `\n**Agent Identity:**
- Name: ${agentProfile.name}
- Role: ${agentProfile.type}
- Description: ${agentProfile.description || 'N/A'}
- Model: ${agentModel}`
    : '';

  // Build time constraint
  const timeMinutes = Math.round(agentTimeout / 60);
  const timeConstraint = `\n**Time Constraint:** You have ${agentTimeout} seconds (${timeMinutes} minutes) to complete this step. Budget your time accordingly.`;

  // Build system prompt prefix
  const systemPromptSection = agentSystemPrompt
    ? `${agentSystemPrompt}\n\n---\n\n`
    : '';

  // Build execution prompt
  const executionPrompt = `${systemPromptSection}You are an execution agent working on a task.
${agentIdentity}
**Task:** ${task.title}
**Description:** ${task.description || 'No description'}${expectedOutput}
**Step ${step.number} of ${allSteps.length}:** ${step.title}
**Agent Type:** ${step.agent}
${timeConstraint}
**Instructions:**
${step.instructions}
${contextPathsSection}

**Previous Steps Completed:**
${allSteps.filter(s => s.number < step.number && s.status === 'complete').map(s => `- Step ${s.number}: ${s.title}`).join('\n') || 'None'}

**Your Job:**
1. Execute this step completely — do not defer work or leave tasks incomplete
2. Create any necessary files in ${outputFolder}/
3. If this involves GitHub, create the repo and push files
4. Report what you accomplished

**Important Context:**
- System username: ${process.env.USER || 'clawmachine'}
- GitHub username (if needed): intelligentclawmachine
- Output directory: ${outputFolder}/

**Required Output Format:**
STEP_COMPLETE
Result: [what you did]
Files Created: [list of files with full paths]
URLs: [any URLs created, e.g., GitHub repo URL]
Notes: [any important info]

**TESTING REQUIREMENTS - You MUST verify your work:**
1. If creating a file: Verify it exists with \`ls -la [filepath]\`
2. If creating a URL (GitHub, website): Verify it returns 200 with \`curl -s -o /dev/null -w "%{http_code}" [URL]\`
3. If running a command: Capture and report any errors
4. NEVER claim success without verification - report actual errors

**Example verification:**
- After creating file: \`ls -la ~/file\` → check output shows file exists
- After GitHub repo: \`curl -s -o /dev/null -w "%{http_code}" https://github.com/intelligentclawmachine/repo\` → must return 200

Begin execution now.`;

  try {
    console.log(`🤖 Spawning agent for Step ${step.number}...`);
    console.log(`   Agent: ${agentProfile?.name || 'default'} | Model: ${agentModel} | Timeout: ${agentTimeout}s`);

    // Create a subagent session via OpenClaw
    const spawnResult = await spawnSubAgent(execId, executionPrompt, taskId, step.number, step.agent, agentModel, agentTimeout);

    // Parse the agent response
    const result = parseAgentResponse(spawnResult.output || '');

    // Also get files and URLs directly from spawnSubAgent result
    const files = spawnResult.files || result.files || [];
    const urls = spawnResult.urls || result.urls || [];

    console.log(`✅ Agent completed Step ${step.number}: ${result.result}`);
    if (files.length) console.log(`   📁 Files: ${files.join(', ')}`);
    if (urls.length) console.log(`   🔗 URLs: ${urls.join(', ')}`);

    return {
      success: true,
      result: result.result,
      outputs: files,
      urls: urls,
      response: spawnResult.output,
      model: spawnResult.model,
      tokensUsed: spawnResult.tokensUsed,
      prompt: executionPrompt
    };

  } catch (err) {
    console.error(`❌ Agent failed Step ${step.number}:`, err.message);
    return {
      success: false,
      result: `Failed: ${err.message}`,
      outputs: [],
      error: err.message
    };
  }
}

/**
 * Spawn a subagent to execute a step
 * This simulates agent execution and creates actual output files
 */
async function spawnSubAgent(execId, prompt, taskId, stepNumber, agentType = 'auto', model = null, timeoutSeconds = null) {
  const promptPath = path.join(CONFIG.OUTPUTS_DIR, `.prompt-${execId}.txt`);

  // Write prompt to file for reference
  await fs.writeFile(promptPath, prompt);

  // Use provided model or fall back to default from config
  const resolvedModel = model || getDefaultModel();
  const resolvedTimeout = timeoutSeconds || 300;

  console.log(`   🤖 Spawning agent for Step ${stepNumber} | Model: ${resolvedModel} | Timeout: ${resolvedTimeout}s`);

  const outputPath = path.join(CONFIG.OUTPUTS_DIR, `step-${stepNumber}-output-${Date.now()}.txt`);

  try {
    const agentResult = await spawnAgentWithResult({
      task: prompt,
      outputPath: outputPath,
      model: resolvedModel,
      timeoutSeconds: resolvedTimeout,
      agentType: agentType
    });

    console.log(`   ✅ Agent completed Step ${stepNumber}: ${agentResult.success ? 'SUCCESS' : 'FAILED'}`);

    if (!agentResult.success) {
      throw new Error(agentResult.error || 'Agent execution failed');
    }

    return {
      output: agentResult.output,
      files: agentResult.files,
      urls: agentResult.urls,
      model: resolvedModel,
      tokensUsed: agentResult.tokensUsed || 0
    };

  } catch (err) {
    console.error(`   ❌ Agent failed Step ${stepNumber}:`, err.message);
    throw err;
  }
}

/**
 * Estimate tokens used (rough approximation)
 */
function estimateTokens(input, output) {
  // Rough estimate: ~4 chars per token
  const totalChars = (input?.length || 0) + (output?.length || 0);
  return Math.round(totalChars / 4);
}

/**
 * Sanitize text to remove JSON artifacts and clean up formatting
 */
function sanitizeAgentText(text) {
  if (!text) return '';

  let cleaned = text;

  // Remove any JSON-like content that leaked through
  // Match patterns like "mediaUrl": null, "key": value, etc.
  cleaned = cleaned.replace(/"[a-zA-Z_]+"\s*:\s*(null|true|false|"[^"]*"|\d+|\[[^\]]*\]|\{[^}]*\})\s*,?/g, '');

  // Remove orphaned JSON brackets and braces
  cleaned = cleaned.replace(/^\s*[\[\]{}]\s*$/gm, '');
  cleaned = cleaned.replace(/,\s*[\]}]/g, '');
  cleaned = cleaned.replace(/[\[{]\s*,/g, '');

  // Remove empty JSON objects/arrays
  cleaned = cleaned.replace(/\{\s*\}/g, '');
  cleaned = cleaned.replace(/\[\s*\]/g, '');

  // Remove lines that look like JSON structure
  cleaned = cleaned.replace(/^\s*"[^"]+"\s*:\s*$/gm, '');

  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Extract file paths from text using various patterns
 */
function extractFilePaths(text) {
  if (!text) return [];

  const paths = new Set();

  // Match ~/path/to/file patterns
  const tildeMatches = text.match(/~\/[^\s,\n\]"']+/g) || [];
  tildeMatches.forEach(p => paths.add(p.replace(/[,\]"']$/, '')));

  // Match /Users/... or /home/... patterns
  const absMatches = text.match(/\/(?:Users|home)\/[^\s,\n\]"']+/g) || [];
  absMatches.forEach(p => paths.add(p.replace(/[,\]"']$/, '')));

  // Match Desktop/Claw Creations/outputs/... patterns
  const relMatches = text.match(/Desktop\/Claw Creations\/outputs\/[^\s,\n\]"']+/g) || [];
  relMatches.forEach(p => paths.add('~/' + p.replace(/[,\]"']$/, '')));

  // Filter out invalid entries
  return Array.from(paths).filter(p =>
    p.length > 5 &&
    !p.includes('undefined') &&
    !p.endsWith('/') &&
    (p.includes('.') || p.includes('output'))
  );
}

/**
 * Parse agent response for results
 */
function parseAgentResponse(response) {
  const result = {
    result: '',
    files: [],
    urls: [],
    notes: ''
  };

  if (!response) return result;

  // Extract result - look for STEP_COMPLETE marker first
  let resultText = '';
  const stepCompleteMatch = response.match(/STEP_COMPLETE\s*\n?([\s\S]*?)(?=STEP_ERROR|$)/i);
  if (stepCompleteMatch) {
    const afterMarker = stepCompleteMatch[1];
    const resultMatch = afterMarker.match(/Result:\s*(.+?)(?=\nFiles|\nURLs|\nNotes|$)/is);
    if (resultMatch) resultText = resultMatch[1].trim();
  }

  // Fallback: try without STEP_COMPLETE marker
  if (!resultText) {
    const resultMatch = response.match(/Result:\s*(.+?)(?=\nFiles:|\nFiles Created:|\nURLs:|\nNotes:|$)/is);
    if (resultMatch) resultText = resultMatch[1].trim();
  }

  // Sanitize the result text
  result.result = sanitizeAgentText(resultText);

  // If still no result, try to extract a summary from the response
  if (!result.result && response.length > 0) {
    // Take first meaningful paragraph
    const lines = response.split('\n').filter(l => l.trim() && !l.includes('{') && !l.includes('}'));
    if (lines.length > 0) {
      result.result = sanitizeAgentText(lines.slice(0, 3).join(' ').substring(0, 500));
    }
  }

  // Extract files - try multiple patterns
  const filesMatch = response.match(/Files Created:\s*(.+?)(?=\nURLs:|\nNotes:|STEP_|$)/is);
  if (filesMatch) {
    const filesText = filesMatch[1].trim();
    if (filesText.toLowerCase() !== 'none') {
      result.files = filesText.split('\n')
        .map(f => f.trim().replace(/^[-•*]\s*/, ''))
        .filter(f => f && f.toLowerCase() !== 'none' && f.length > 3);
    }
  }

  // Also extract file paths from the full response
  const extractedPaths = extractFilePaths(response);
  extractedPaths.forEach(p => {
    if (!result.files.includes(p)) {
      result.files.push(p);
    }
  });

  // Extract URLs
  const urlsMatch = response.match(/URLs:\s*(.+?)(?=\nNotes:|STEP_|$)/is);
  if (urlsMatch) {
    const urlsText = urlsMatch[1].trim();
    if (urlsText.toLowerCase() !== 'none') {
      result.urls = urlsText.split('\n')
        .map(u => u.trim())
        .filter(u => u && u.startsWith('http'));
    }
  }

  // Also extract URLs from full response
  const urlMatches = response.match(/https?:\/\/[^\s,\n\]"'<>]+/g) || [];
  urlMatches.forEach(u => {
    const cleanUrl = u.replace(/[,\]"'<>]$/, '');
    if (!result.urls.includes(cleanUrl) && !cleanUrl.includes('example.com')) {
      result.urls.push(cleanUrl);
    }
  });

  // Extract notes
  const notesMatch = response.match(/Notes:\s*(.+?)(?=STEP_|$)/is);
  if (notesMatch) {
    result.notes = sanitizeAgentText(notesMatch[1].trim());
  }

  return result;
}

/**
 * Execute a single step of a plan
 */
async function executePlanStep(taskId, stepNumber, steps, execId) {
  const step = steps.find(s => s.number === stepNumber);
  if (!step) throw new Error(`Step ${stepNumber} not found`);
  
  step.status = 'in-progress';
  step.startedAt = new Date().toISOString();
  
  // Update task
  const tasks = await getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.executionStatus = `step-${stepNumber}-of-${steps.length}`;
    await saveTasks(tasks);
  }
  
  // Broadcast progress
  const progress = Math.round(((stepNumber - 0.5) / steps.length) * 100);
  broadcastUpdate('execution-progress', { taskId, stepNumber, progress, status: 'in-progress', stepTitle: step.title });
  
  // Log step start
  await appendLog(taskId, {
    timestamp: new Date().toISOString(),
    level: 'info',
    stepNumber,
    message: `Step ${stepNumber} started: ${step.title}`,
    agent: step.agent
  });
  
  console.log(`▶️ Step ${stepNumber}: ${step.title} (${step.agent})`);
  
  // Update execution session with model info and step title
  const execSession = executionSessions.get(execId);
  const agentProfile = await getAgentProfileForTask(taskId);
  const modelDisplay = getModelDisplayName(agentProfile?.model || getDefaultModel());

  if (execSession) {
    execSession.currentStepModel = modelDisplay;
    execSession.currentStepTitle = step.title;
    execSession.currentStepTokens = 0;
    executionSessions.set(execId, execSession);

    // Also update activeSessions with currentStepTitle
    for (const [sessionId, activeSession] of activeSessions) {
      if (activeSession.taskId === taskId && activeSession.type === 'execution') {
        activeSession.currentStepTitle = step.title;
        activeSession.currentStepModel = modelDisplay;
        break;
      }
    }

    // Broadcast model update to frontend
    broadcastUpdate('step-model-update', {
      execId,
      taskId,
      stepNumber,
      model: modelDisplay,
      agent: step.agent,
      stepTitle: step.title
    });
  }
  
  // Execute step with real agent
  const agentResult = await executeStepWithAgent(taskId, step, steps, execId);
  
  // Update session with tokens used
  if (execSession && agentResult.tokensUsed) {
    execSession.tokensUsed = (execSession.tokensUsed || 0) + agentResult.tokensUsed;
    execSession.currentStepTokens = agentResult.tokensUsed;
    executionSessions.set(execId, execSession);
    
    // Broadcast token update
    broadcastUpdate('step-tokens-update', {
      execId,
      taskId,
      stepNumber,
      tokensUsed: agentResult.tokensUsed,
      totalTokens: execSession.tokensUsed
    });
  }
  
  step.status = agentResult.success ? 'complete' : 'error';
  step.completedAt = new Date().toISOString();
  step.result = agentResult.result || `Completed: ${step.title}`;
  step.outputs = agentResult.outputs || [];
  step.urls = agentResult.urls || [];
  step.agentResponse = agentResult.response;
  step.model = agentResult.model;
  step.tokensUsed = agentResult.tokensUsed;
  
  // Broadcast completion
  const completedProgress = Math.round((stepNumber / steps.length) * 100);
  broadcastUpdate('execution-progress', { taskId, stepNumber, progress: completedProgress, status: 'complete' });
  
  return step;
}

/**
 * Helper function to execute a plan (used by both endpoint and auto-execute)
 */
async function executePlan(taskId, task) {
  const execId = `exec-${taskId}-${Date.now()}`;
  const sessionId = `session-${Date.now()}`;
  
  // Create execution session
  const execSession = {
    id: execId,
    sessionId,
    taskId,
    taskTitle: task.title,
    agentType: task.agentType || 'auto',
    type: 'execution',
    status: 'executing',
    startedAt: new Date().toISOString(),
    currentStep: 1
  };
  
  executionSessions.set(execId, execSession);
  activeSessions.set(sessionId, {
    id: sessionId,
    taskId,
    taskTitle: task.title,
    agentType: task.agentType || 'auto',
    type: 'execution',
    status: 'executing',
    startedAt: new Date().toISOString(),
    currentStep: 'Starting execution...',
    currentStepTitle: ''
  });
  await persistActiveSessions();
  
  // Log event
  await logEvent({
    type: 'agent',
    severity: 'info',
    title: 'Plan execution started',
    description: `Executing plan for task: ${task.title}`,
    metadata: { taskId, execId, sessionId }
  });
  
  // Update task
  task.executionStatus = 'executing';
  await saveTasks(await getTasks());
  
  // Start execution in background
  runPlanExecution(taskId, execId).catch(err => {
    console.error(`Background execution failed for ${taskId}:`, err);
  });
  
  // Notify WebSocket clients
  broadcastUpdate('execution-started', { taskId, sessionId, execId });
  
  return { execId, sessionId };
}

/**
 * Run full plan execution
 */
async function runPlanExecution(taskId, execId) {
  const plan = await readPlan(taskId);
  if (!plan) throw new Error('Plan not found');
  
  const steps = parsePlanSteps(plan.content);
  const tasks = await getTasks();
  const task = tasks.find(t => t.id === taskId);
  
  // Look up agent profile for this task
  const agentProfile = task?.agentId ? (await loadAgents()).find(a => a.id === task.agentId) : null;
  const resolvedModel = agentProfile?.model || getDefaultModel();

  // Create execution session record
  const execSession = {
    id: execId,
    taskId,
    taskTitle: task?.title || 'Unknown',
    agentType: task?.agentType || 'auto',
    model: resolvedModel,
    type: 'execution',
    stepsTotal: steps.length,
    stepsCompleted: 0,
    currentStepTitle: '',
    startedAt: new Date().toISOString(),
    status: 'executing'
  };
  
  executionSessions.set(execId, execSession);
  
  // Track prompts for reporting
  const executionPrompts = [];
  
  try {
    for (let i = 0; i < steps.length; i++) {
      const session = executionSessions.get(execId);
      if (session.status === 'killed') {
        console.log(`Execution ${execId} killed`);
        session.status = 'killed';
        await archiveSession(session);
        executionSessions.delete(execId);
        for (const [sessionId, activeSession] of activeSessions) {
          if (activeSession.taskId === taskId && activeSession.type === 'execution') {
            activeSessions.delete(sessionId);
            break;
          }
        }
        await persistActiveSessions();
        return;
      }
      
      session.currentStep = i + 1;
      const stepResult = await executePlanStep(taskId, steps[i].number, steps, execId);
      
      // Capture prompt if available
      if (stepResult && stepResult.prompt) {
        executionPrompts.push({
          step: steps[i].number,
          title: steps[i].title,
          agent: steps[i].agent,
          prompt: stepResult.prompt,
          timestamp: new Date().toISOString()
        });
      }
      
      session.stepsCompleted = i + 1;
      
      // Update active session in real-time
      executionSessions.set(execId, session);
    }
    
    // All steps complete - NOW mark task as done
    execSession.status = 'complete';
    
    // Collect outputs from all steps
    const outputFiles = steps.flatMap(s => s.outputs || []).filter(f => f);
    
    // Collect URLs from all steps
    const allUrls = steps.flatMap(s => s.urls || []).filter(u => u);
    
    // Build completion summary
    const completionSummary = {
      taskId,
      taskTitle: task?.title || 'Unknown Task',
      completedAt: new Date().toISOString(),
      stepsCompleted: steps.length,
      totalSteps: steps.length,
      whatWasAccomplished: steps.map(s => `✓ ${s.title}: ${s.result || 'Completed'}`).join('\n'),
      outputFiles: outputFiles.length > 0 ? outputFiles : ['No files generated'],
      outputLocation: path.join(process.env.HOME, 'Desktop/Claw Creations/outputs'),
      finderPath: `~/Desktop/Claw Creations/outputs/`,
      urls: allUrls,
      durationMinutes: execSession.durationMinutes || 0,
      cost: execSession.estimatedCost || 0
    };
    
    // Update task with completion summary
    if (task) {
      task.executionStatus = 'complete';
      task.status = 'done';
      task.completed = new Date().toISOString();
      task.completionSummary = completionSummary;
      await saveTasks(tasks);
    }
    
    // Save completion summary to plan archive
    const summaryPath = path.join(PLANS_CONFIG.ARCHIVE_DIR, taskId, 'completion-summary.json');
    try {
      await fs.mkdir(path.dirname(summaryPath), { recursive: true });
      await fs.writeFile(summaryPath, JSON.stringify(completionSummary, null, 2));
      console.log(`📝 Completion summary saved: ${summaryPath}`);
    } catch (err) {
      console.warn('Could not save completion summary:', err.message);
    }
    
    // Calculate actual duration
    const durationMs = Date.now() - new Date(execSession.startedAt).getTime();
    execSession.durationMinutes = Math.round(durationMs / 60000 * 10) / 10;
    
    // Calculate cost based on tokens used
    if (!execSession.tokensUsed) {
      execSession.tokensUsed = Math.round(execSession.durationMinutes * 1000);
    }
    execSession.estimatedCost = parseFloat((execSession.tokensUsed * 0.0000005).toFixed(3));
    
    // Update completion summary with correct duration and cost
    completionSummary.durationMinutes = execSession.durationMinutes;
    completionSummary.cost = execSession.estimatedCost;
    
    // Update task with corrected completion summary
    if (task) {
      task.completionSummary = completionSummary;
      await saveTasks(tasks);
    }
    
    // Archive plan and session
    await archivePlan(taskId, { 
      completed: true, 
      result: completionSummary.whatWasAccomplished,
      outputs: outputFiles,
      summary: completionSummary
    });
    await archiveSession(execSession);
    executionSessions.delete(execId);
    
    // ============================================
    // COMPLETION: Create report & move to done (NOT archive)
    // ============================================
    if (task) {
      try {
        // Create report first (captures all task info + prompts)
        await createReport(task, completionSummary, executionPrompts);
        console.log(`📊 Report created for task: ${task.title} (${executionPrompts.length} prompts captured)`);
        
        // Move to done status (keep in tasks list for Past Sessions view)
        task.status = 'done';
        task.executionStatus = 'complete';
        task.completed = new Date().toISOString();
        task.completionSummary = completionSummary;
        await saveTasks(tasks);
        console.log(`📦 Task moved to done: ${task.title}`);
        
        // Broadcast completion event
        broadcastUpdate('task-completed', { 
          taskId, 
          title: task.title,
          message: 'Task completed - moved to Past Sessions'
        });
      } catch (err) {
        console.error('Error completing task:', err);
      }
    }
    
    // Also find and remove related planning session from activeSessions
    for (const [sessionId, session] of activeSessions) {
      if (session.taskId === taskId) {
        activeSessions.delete(sessionId);
        console.log(`🗑️ Removed session ${sessionId} (${session.type}) from active sessions`);
      }
    }
    await persistActiveSessions();
    
    broadcastUpdate('execution-complete', { 
      taskId, 
      execId, 
      status: 'success',
      summary: completionSummary
    });
    console.log(`✅ Execution ${execId} complete (${execSession.durationMinutes}min, $${execSession.estimatedCost})`);
    console.log(`📁 Outputs: ${completionSummary.finderPath}`);
    console.log(`📄 Files: ${outputFiles.join(', ') || 'None'}`);
    
  } catch (err) {
    console.error(`Execution ${execId} failed:`, err);
    execSession.status = 'error';
    execSession.error = err.message;
    
    // Archive failed session to history
    await archiveSession(execSession);
    
    // Clean up both session stores
    executionSessions.delete(execId);
    
    // Also find and remove from activeSessions
    for (const [sessionId, session] of activeSessions) {
      if (session.taskId === taskId && session.type === 'execution') {
        activeSessions.delete(sessionId);
        console.log(`🗑️ Removed failed session ${sessionId} from active sessions`);
        break;
      }
    }
    await persistActiveSessions();
    
    // Update task status to reflect error
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.executionStatus = 'error';
      task.status = 'done'; // Mark as done (moves to Past Sessions, not archive)
      task.completed = new Date().toISOString();
      
      // Create error completion summary for reporting
      const errorSummary = {
        taskId,
        taskTitle: task.title,
        completedAt: new Date().toISOString(),
        stepsCompleted: execSession.currentStep || 0,
        totalSteps: execSession.steps?.length || 1,
        whatWasAccomplished: `❌ EXECUTION FAILED\n\nError: ${err.message}\n\nStep reached: ${execSession.currentStep || 'N/A'}\n\nThis task failed during execution. Check the logs below for details.`,
        outputFiles: ['No files generated - execution failed'],
        outputLocation: path.join(process.env.HOME, 'Desktop/Claw Creations/outputs'),
        finderPath: `~/Desktop/Claw Creations/outputs/`,
        urls: [],
        durationMinutes: execSession.durationMinutes || 0,
        cost: execSession.estimatedCost || 0,
        error: true,
        errorMessage: err.message,
        logs: execSession.logs || []
      };
      
      task.completionSummary = errorSummary;
      await saveTasks(tasks);
      
      // Create report for failed task too
      try {
        await createReport(task, errorSummary);
        console.log(`📊 Error report created for failed task: ${task.title}`);
        
        // Move to done (keeps in tasks list for Past Sessions view)
        console.log(`📦 Failed task moved to done: ${task.title}`);
        
        broadcastUpdate('task-completed', { 
          taskId, 
          title: task.title,
          message: 'Task failed - moved to Past Sessions',
          error: true
        });
      } catch (err) {
        console.error('Error handling failed task:', err);
      }
    }
    
    broadcastUpdate('execution-error', { taskId, execId, error: err.message });
  }
}

// POST /plans/:taskId/planning - Trigger planning phase
app.post('/api/v1/plans/:taskId/planning', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { agentType } = req.body || {};
    
    // Check if plan already exists
    if (await planExists(taskId)) {
      const existingPlan = await readPlan(taskId);
      if (existingPlan && existingPlan.metadata && existingPlan.metadata.status === 'plan-ready') {
        return res.status(409).json({ 
          error: 'Plan already exists', 
          message: 'A plan already exists for this task. Use the execute endpoint to run it.',
          taskId,
          planStatus: 'plan-ready'
        });
      }
    }
    
    // Get task details
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Update task execution status
    task.executionStatus = 'planning';
    task.agentType = agentType || task.agentType || 'auto';
    await saveTasks(tasks);
    // await pushToObsidian(task); // DISABLED
    
    // Create plan directory
    const planDir = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId);
    await fs.mkdir(planDir, { recursive: true });
    
    // Create initial log entry
    await appendLog(taskId, {
      level: 'info',
      message: 'Planning phase initiated',
      timestamp: new Date().toISOString()
    });
    
    // Create session record
    const sessionId = `session-${Date.now()}`;
    activeSessions.set(sessionId, {
      id: sessionId,
      taskId,
      taskTitle: task.title,
      agentType: task.agentType,
      type: 'planning',
      status: 'planning',
      startedAt: new Date().toISOString(),
      currentStep: 'Generating plan...'
    });
    await persistActiveSessions();
    
    // Log event
    await logEvent({
      type: 'agent',
      severity: 'info',
      title: 'Planning phase started',
      description: `Planning agent started for task: ${task.title}`,
      metadata: { taskId, sessionId, agentType: task.agentType }
    });
    
    // Notify WebSocket clients
    broadcastUpdate('session-started', { taskId, sessionId, sessionType: 'planning' });
    
    // ============================================
    // PHASE 3: Spawn actual planning agent
    // ============================================
    
    // Build planning prompt
    const planningPrompt = `You are a planning agent. Create a detailed execution plan for this task:

**Task:** ${task.title}
**Description:** ${task.description || 'No description provided'}
**Priority:** ${task.priority}
**Agent Type:** ${task.agentType || 'auto'}

Create a plan with:
1. Clear objective
2. 3-7 concrete execution steps
3. Success criteria
4. Estimated time for each step

Save the plan to: ~/.openclaw/workspace/plans/active/${taskId}/plan.md

Use this format:

---
taskId: ${taskId}
status: plan-ready
stepCount: {N}
---

# Execution Plan

## Objective
{Clear objective statement}

## Execution Steps

### Step 1: {Title}
**Agent:** {agentType}
**Time:** {X} minutes

{Detailed instructions}

### Step 2: ...

## Success Criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}

End with:
PLAN_COMPLETE
Estimated total time: {X} minutes
Confidence: {High|Medium|Low}
`;

    // Spawn planning agent as subagent
    try {
      const planningTask = `Generate execution plan for task "${task.title}" (${taskId}) and save to ~/.openclaw/workspace/plans/active/${taskId}/plan.md. Task description: ${task.description || 'Create a simple HTML to-do list app'}`;
      
      console.log(`🤖 Spawning REAL planning agent for task ${taskId}`);
      
      // PRODUCTION: Use real agent to create plan
      const planOutputPath = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId, 'plan.md');
      
      const planningPrompt = `You are a planning agent. Create a detailed execution plan for this task:

**Task Title:** ${task.title}
**Task Description:** ${task.description || 'No description provided'}
**Priority:** ${task.priority}

Create a plan with:
1. Clear objective based on the task
2. 3-7 concrete execution steps that make sense for THIS specific task
3. Realistic time estimates per step
4. Success criteria

Save the plan to: ${planOutputPath}

Use this format:

---
taskId: ${taskId}
status: plan-ready
stepCount: {N}
estimatedMinutes: {total}
---

# Execution Plan: ${task.title}

## Objective
{Clear objective specific to this task}

## Execution Steps

### Step 1: {Step Title}
**Agent:** {coder|ui-designer|researcher|writer|planner}
**Time:** {X} minutes

{Specific instructions for this step}

### Step 2: ...
(continue for each step)

## Success Criteria
- [ ] {Specific criterion}
- [ ] ...

PLAN_COMPLETE
Estimated total time: {X} minutes
Confidence: {High|Medium|Low}`;

      // Execute planning agent — use agent profile model if available
      const planAgentProfile = await getAgentProfileForTask(taskId);
      const planModel = planAgentProfile?.model || getDefaultModel();
      const planTimeout = planAgentProfile?.sandbox?.timeout || 300;

      const planResult = await spawnAgentWithResult({
        task: planningPrompt,
        outputPath: planOutputPath,
        model: planModel,
        timeoutSeconds: planTimeout,
        agentType: 'planner'
      });
      
      if (!planResult.success) {
        throw new Error(`Planning failed: ${planResult.error || 'Unknown error'}`);
      }
      
      console.log(`✅ Planning agent completed for task ${taskId}`);
      console.log(`   Result: ${planResult.result}`);
      
      // Verify plan file exists
      try {
        await fs.access(planOutputPath);
        console.log(`✅ Plan file created: ${planOutputPath}`);
      } catch (err) {
        console.error(`❌ Plan file not found: ${planOutputPath}`);
        throw new Error('Planning agent did not create plan file');
      }
      
      // Update session status
      activeSessions.set(sessionId, {
        ...activeSessions.get(sessionId),
        status: 'plan-ready',
        planId: taskId,
        currentStep: 'Plan ready - auto-executing'
      });
      await persistActiveSessions();
      
      // Update task status
      task.executionStatus = 'plan-ready';
      await saveTasks(tasks);
      
      // Log completion
      await appendLog(taskId, {
        level: 'success',
        message: 'Planning complete via agent - auto-executing',
        details: planResult.result,
        timestamp: new Date().toISOString()
      });
      
      // Notify frontend
      broadcastUpdate('plan-ready', { taskId, sessionId });
      
      // ============================================
      // AUTO-EXECUTE: Queue execution immediately after planning
      // ============================================
      console.log(`🚀 Auto-executing plan for task ${taskId}`);
      
      try {
        // Remove planning session first
        activeSessions.delete(sessionId);
        await persistActiveSessions();
        broadcastUpdate('session-ended', { sessionId, taskId });
        
        // Queue execution with persistence
        await enqueueExecution(taskId, task);
        console.log(`✅ Auto-execution queued for task ${taskId}`);
      } catch (execErr) {
        console.error(`❌ Auto-execution failed for task ${taskId}:`, execErr);
        
        // Update task with error
        const tasks = await getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.executionStatus = 'error';
          await saveTasks(tasks);
        }
      }
      
    } catch (spawnErr) {
      console.error('Error in planning phase:', spawnErr);
      
      // Update session to error state
      activeSessions.set(sessionId, {
        ...activeSessions.get(sessionId),
        status: 'error',
        error: spawnErr.message
      });
      await persistActiveSessions();
      
      // Update task to error state
      task.executionStatus = 'error';
      await saveTasks(tasks);
      
      broadcastUpdate('execution-error', { 
        taskId, 
        sessionId,
        error: spawnErr.message 
      });
    }
    
    res.json({
      success: true,
      taskId,
      sessionId,
      status: 'planning',
      message: 'Planning phase initiated'
    });
    
  } catch (err) {
    console.error('Error starting planning phase:', err);
    res.status(500).json({ error: 'Failed to start planning phase' });
  }
});

// POST /plans/:taskId/execute - Trigger plan execution (Phase 4)
// Supports both plan-based execution and direct execution without a plan
app.post('/api/v1/plans/:taskId/execute', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { agentType } = req.body || {};
    
    // Get task details
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if plan exists
    const plan = await readPlan(taskId);
    
    // If no plan exists, create a simple one-step plan for direct execution
    if (!plan) {
      console.log(`📋 No plan found for ${taskId}, creating direct execution plan`);
      
      const planDir = path.join(PLANS_CONFIG.ACTIVE_DIR, taskId);
      await fs.mkdir(planDir, { recursive: true });
      
      // Create a simple single-step plan for direct execution
      const directPlanContent = `---
taskId: ${taskId}
created: ${new Date().toISOString()}
status: plan-ready
stepCount: 1
confidence: high
estimatedMinutes: 10
---

# Execution Plan: ${task.title}

## Objective
Complete the task: ${task.title}

## Execution Steps

### Step 1: Execute Task
**Agent:** ${task.agentType || 'auto'}
**Time:** 10 minutes

${task.description || 'Complete the task as specified.'}

Execute the task completely and create any necessary outputs.

## Success Criteria
- [ ] Task completed successfully
- [ ] All outputs created
- [ ] Results verified

PLAN_COMPLETE
Estimated total time: 10 minutes
Confidence: High
`;
      
      await writePlan(taskId, directPlanContent);
      console.log(`✅ Direct execution plan created for ${taskId}`);
    }
    
    // Update task execution status
    task.executionStatus = 'executing';
    task.agentType = agentType || task.agentType || 'auto';
    await saveTasks(tasks);
    
    // Queue execution (persistent) — session is created by executePlan() in the queue processor
    // to avoid duplicate sessions showing in the active sessions panel
    await enqueueExecution(taskId, task);

    console.log(`✅ Queued execution for task ${taskId}`);
    console.log(`📊 Active sessions count: ${activeSessions.size}`);

    res.json({
      success: true,
      taskId,
      status: 'queued',
      message: 'Plan execution queued'
    });
    
  } catch (err) {
    console.error('Error starting execution:', err);
    res.status(500).json({ error: 'Failed to start execution' });
  }
});

// GET /sessions/active - Get all active sessions
app.get('/api/v1/sessions/active', async (req, res) => {
  try {
    const sessions = Array.from(activeSessions.values());
    console.log(`📡 GET /sessions/active - returning ${sessions.length} sessions`);
    sessions.forEach(s => console.log(`   - ${s.id}: ${s.taskTitle} (${s.type})`));
    res.json({ sessions, count: sessions.length });
  } catch (err) {
    console.error('Error getting active sessions:', err);
    res.status(500).json({ error: 'Failed to get active sessions' });
  }
});

// GET /sessions/history - Get past completed sessions
app.get('/api/v1/sessions/history', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const sessions = pastSessions.slice(0, parseInt(limit));
    
    // Calculate totals
    const totalCost = pastSessions.reduce((sum, s) => sum + (s.estimatedCost || 0), 0);
    const totalDuration = pastSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const totalTokens = pastSessions.reduce((sum, s) => sum + (s.tokensUsed || 0), 0);
    
    res.json({ 
      sessions, 
      count: sessions.length,
      totals: {
        cost: Math.round(totalCost * 100) / 100,
        duration: Math.round(totalDuration * 10) / 10,
        tokens: totalTokens
      }
    });
  } catch (err) {
    console.error('Error getting session history:', err);
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

// POST /sessions/:sessionId/kill - Terminate a session
app.post('/api/v1/sessions/:sessionId/kill', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Update task status
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === session.taskId);
    if (task) {
      task.executionStatus = 'error';
      await saveTasks(tasks);
      // await pushToObsidian(task); // DISABLED
    }
    
    // Remove session
    activeSessions.delete(sessionId);
    await persistActiveSessions();
    
    // Log event
    await logEvent({
      type: 'agent',
      severity: 'warning',
      title: 'Session terminated',
      description: `Session ${sessionId} was manually killed`,
      metadata: { sessionId, taskId: session.taskId }
    });
    
    // Notify WebSocket clients
    broadcastUpdate('session-ended', { sessionId, taskId: session.taskId });
    
    res.json({ success: true, sessionId, message: 'Session terminated' });
    
  } catch (err) {
    console.error('Error killing session:', err);
    res.status(500).json({ error: 'Failed to kill session' });
  }
});

// GET /sessions/:sessionId/log - Get session log (placeholder for Phase 4)
app.get('/api/v1/sessions/:sessionId/log', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Return basic session info as log for now
    res.json({
      sessionId,
      logs: [
        { timestamp: session.startedAt, level: 'info', message: 'Session started' },
        { timestamp: new Date().toISOString(), level: 'info', message: session.currentStep }
      ]
    });
    
  } catch (err) {
    console.error('Error getting session log:', err);
    res.status(500).json({ error: 'Failed to get session log' });
  }
});

// ============================================
// UTILITY: Folder picker & Open in Finder
// ============================================

// POST /api/v1/utils/pick-folder - Open native macOS folder picker
app.post('/api/v1/utils/pick-folder', async (req, res) => {
  try {
    const { currentPath } = req.body || {};
    const defaultDir = currentPath
      ? currentPath.replace(/^~/, process.env.HOME)
      : path.join(process.env.HOME, 'Desktop');

    const { execSync } = require('child_process');
    const script = `osascript -e 'set theFolder to choose folder with prompt "Select Output Folder" default location POSIX file "${defaultDir}"' -e 'return POSIX path of theFolder'`;
    const result = execSync(script, { timeout: 60000, encoding: 'utf-8' }).trim();

    // Convert back to ~ shorthand if under home dir
    const homePath = process.env.HOME;
    const displayPath = result.startsWith(homePath)
      ? '~' + result.slice(homePath.length)
      : result;

    // Remove trailing slash for consistency
    const cleanPath = displayPath.replace(/\/$/, '');

    res.json({ success: true, path: cleanPath });
  } catch (err) {
    // User cancelled the dialog or other error
    if (err.status === 1 || err.message?.includes('User canceled')) {
      return res.json({ success: false, cancelled: true });
    }
    console.error('Error opening folder picker:', err);
    res.status(500).json({ error: 'Failed to open folder picker' });
  }
});

// POST /api/v1/utils/pick-file - Open native macOS file picker
app.post('/api/v1/utils/pick-file', async (req, res) => {
  try {
    const { currentPath } = req.body || {};
    const defaultDir = currentPath
      ? currentPath.replace(/^~/, process.env.HOME)
      : path.join(process.env.HOME, 'Desktop');

    const { execSync } = require('child_process');
    const script = `osascript -e 'set theFile to choose file with prompt "Select Context File" default location POSIX file "${defaultDir}"' -e 'return POSIX path of theFile'`;
    const result = execSync(script, { timeout: 60000, encoding: 'utf-8' }).trim();

    const homePath = process.env.HOME;
    const displayPath = result.startsWith(homePath)
      ? '~' + result.slice(homePath.length)
      : result;

    res.json({ success: true, path: displayPath });
  } catch (err) {
    if (err.status === 1 || err.message?.includes('User canceled')) {
      return res.json({ success: false, cancelled: true });
    }
    console.error('Error opening file picker:', err);
    res.status(500).json({ error: 'Failed to open file picker' });
  }
});

// POST /api/v1/utils/open-in-finder - Open a path in macOS Finder
app.post('/api/v1/utils/open-in-finder', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const { exec } = require('child_process');
    const resolvedPath = filePath.replace(/^~/, process.env.HOME);

    // Check if path exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return res.status(404).json({ error: 'Path not found', path: resolvedPath });
    }

    // Check if it's a file or directory
    const stat = await fs.stat(resolvedPath);
    if (stat.isFile()) {
      // Reveal file in Finder (selects it)
      exec(`open -R "${resolvedPath}"`);
    } else {
      // Open directory in Finder
      exec(`open "${resolvedPath}"`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error opening in Finder:', err);
    res.status(500).json({ error: 'Failed to open in Finder' });
  }
});

// ============================================
// AGENT PROFILES CRUD (Step 1)
// ============================================

const AGENT_PROFILES_FILE = path.join(process.env.HOME, '.openclaw', 'workspace', 'agent-profiles.json');
const AGENT_STORAGE_DIR = path.join(process.env.HOME, '.openclaw', 'agents');

const AGENT_PROFILE_TEMPLATE = {
  id: '',
  name: '',
  type: 'custom',
  model: 'anthropic/claude-sonnet-4-5',
  prompt: '',
  description: '',
  icon: '🤖',
  tags: [],
  metadata: {
    usageCount: 0,
    lastUsedAt: null
  },
  sandbox: {
    networkAccess: 'full',
    filesystemAccess: { mode: 'workspace-only' },
    timeout: 300
  },
  tools: {
    mode: 'all',
    allowList: [],
    denyList: []
  },
  identity: {
    displayName: 'Agent',
    emoji: '🤖',
    color: '#4A90D9'
  },
  workspace: path.join(process.env.HOME, '.openclaw', 'workspace'),
  agentDir: '',
  attachedFiles: [],
  createdAt: '',
  updatedAt: '',
  isDefault: false
};

// Default agent presets removed — users create their own via Agent Manager

function slugifyAgentName(name, id = '') {
  const slugBase = ((name || 'agent').toLowerCase() || 'agent')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'agent';
  const hash = id ? id.slice(0, 6) : uuidv4().slice(0, 6);
  return `${slugBase}-${hash}`;
}

async function ensureAgentStorageDir() {
  await fs.mkdir(AGENT_STORAGE_DIR, { recursive: true });
}

async function ensureAgentWorkspaceDir(agentDir) {
  if (!agentDir) return;
  await fs.mkdir(agentDir, { recursive: true });
  await fs.mkdir(path.join(agentDir, 'files'), { recursive: true });
}

function createAgentRecord(payload = {}) {
  const now = new Date().toISOString();
  const template = JSON.parse(JSON.stringify(AGENT_PROFILE_TEMPLATE));
  return {
    ...template,
    ...payload,
    id: payload.id || uuidv4(),
    name: payload.name?.trim() || template.name || 'Unnamed Agent',
    description: payload.description || template.description,
    prompt: payload.prompt || template.prompt,
    type: payload.type || template.type,
    icon: payload.icon || template.icon,
    model: payload.model || template.model,
    workspace: payload.workspace || template.workspace,
    tags: Array.isArray(payload.tags) ? payload.tags : template.tags,
    metadata: { ...template.metadata, ...(payload.metadata || {}) },
    sandbox: { ...template.sandbox, ...(payload.sandbox || {}) },
    tools: { ...template.tools, ...(payload.tools || {}) },
    identity: {
      ...template.identity,
      ...(payload.identity || {}),
      displayName: payload.identity?.displayName || payload.name || template.identity.displayName,
      emoji: payload.identity?.emoji || payload.icon || template.identity.emoji
    },
    attachedFiles: Array.isArray(payload.attachedFiles) ? payload.attachedFiles : template.attachedFiles,
    isDefault: payload.isDefault || false,
    createdAt: payload.createdAt || now,
    updatedAt: payload.updatedAt || now,
    agentDir: payload.agentDir || template.agentDir
  };
}

async function loadAgents() {
  try {
    const raw = await fs.readFile(AGENT_PROFILES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.profiles && Array.isArray(parsed.profiles)) return parsed.profiles;
    return [];
  } catch {
    return [];
  }
}

async function saveAgents(agents) {
  await fs.mkdir(path.dirname(AGENT_PROFILES_FILE), { recursive: true });
  await fs.writeFile(
    AGENT_PROFILES_FILE,
    JSON.stringify({ version: 1, lastUpdated: new Date().toISOString(), profiles: agents }, null, 2),
    'utf8'
  );
}

async function persistAgentProfileFile(agent) {
  if (!agent.agentDir) return;
  await ensureAgentWorkspaceDir(agent.agentDir);
  const profilePath = path.join(agent.agentDir, 'agent-profile.json');
  await fs.writeFile(profilePath, JSON.stringify(agent, null, 2), 'utf8');
}

function applyFilters(profiles, query) {
  let filtered = [...profiles];
  if (query.search) {
    const search = query.search.toLowerCase();
    filtered = filtered.filter((agent) =>
      agent.name.toLowerCase().includes(search) ||
      agent.description?.toLowerCase().includes(search) ||
      agent.tags?.some((tag) => tag.toLowerCase().includes(search))
    );
  }
  if (query.type && query.type !== 'all') {
    filtered = filtered.filter((agent) => agent.type === query.type);
  }
  if (query.tags) {
    const required = query.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    if (required.length) {
      filtered = filtered.filter((agent) =>
        required.every((tag) => (agent.tags || []).map((t) => t.toLowerCase()).includes(tag))
      );
    }
  }
  const sortField = query.sort || 'name';
  const sortOrder = (query.order || 'asc').toLowerCase();
  filtered.sort((a, b) => {
    let left = sortField === 'usage' ? (a.metadata?.usageCount || 0) : a[sortField];
    let right = sortField === 'usage' ? (b.metadata?.usageCount || 0) : b[sortField];
    if (sortField === 'createdAt' || sortField === 'updatedAt') {
      left = new Date(left).getTime() || 0;
      right = new Date(right).getTime() || 0;
    }
    if (typeof left === 'string') left = left.toLowerCase();
    if (typeof right === 'string') right = right.toLowerCase();
    if (left === right) return 0;
    if (sortOrder === 'desc') return left > right ? -1 : 1;
    return left > right ? 1 : -1;
  });
  return filtered;
}

async function seedDefaultAgentProfiles() {
  // Just ensure directories exist — no default presets seeded
  await ensureAgentStorageDir();
  return await loadAgents();
}

// GET /agents - list all agent profiles
app.get('/api/v1/agents', async (req, res) => {
  try {
    const agents = await loadAgents();
    const filtered = applyFilters(agents, req.query);
    res.json({ agents: filtered, total: filtered.length });
  } catch (err) {
    console.error('Error loading agents:', err);
    res.status(500).json({ error: 'Failed to load agents' });
  }
});

// GET /agents/tags - unique tag list
app.get('/api/v1/agents/tags', async (req, res) => {
  try {
    const agents = await loadAgents();
    const tags = [...new Set(agents.flatMap((a) => a.tags || []))].sort();
    res.json({ tags });
  } catch (err) {
    console.error('Error loading agent tags:', err);
    res.status(500).json({ error: 'Failed to load tags' });
  }
});

// GET /agents/:id - single profile
app.get('/api/v1/agents/:id', async (req, res) => {
  try {
    const agents = await loadAgents();
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    console.error('Error fetching agent:', err);
    res.status(500).json({ error: 'Failed to load agent' });
  }
});

// POST /agents - create new agent
app.post('/api/v1/agents', async (req, res) => {
  try {
    const profile = createAgentRecord(req.body);
    const slug = slugifyAgentName(profile.name, profile.id);
    profile.agentDir = path.join(AGENT_STORAGE_DIR, slug);
    await ensureAgentWorkspaceDir(profile.agentDir);
    const agents = await loadAgents();
    agents.push(profile);
    await Promise.all([saveAgents(agents), persistAgentProfileFile(profile)]);
    broadcastUpdate('agent-updated');
    res.status(201).json(profile);
  } catch (err) {
    console.error('Error creating agent profile:', err);
    res.status(500).json({ error: 'Failed to create agent profile' });
  }
});

// PATCH /agents/:id - update profile
app.patch('/api/v1/agents/:id', async (req, res) => {
  try {
    const agents = await loadAgents();
    const idx = agents.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Agent not found' });
    const updated = {
      ...agents[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
      metadata: { ...agents[idx].metadata, ...(req.body.metadata || {}) },
      tags: req.body.tags || agents[idx].tags || [],
      sandbox: { ...agents[idx].sandbox, ...(req.body.sandbox || {}) },
      tools: { ...agents[idx].tools, ...(req.body.tools || {}) },
      identity: { ...agents[idx].identity, ...(req.body.identity || {}) }
    };
    agents[idx] = updated;
    await Promise.all([saveAgents(agents), persistAgentProfileFile(updated)]);
    broadcastUpdate('agent-updated');
    res.json(updated);
  } catch (err) {
    console.error('Error updating agent profile:', err);
    res.status(500).json({ error: 'Failed to update agent profile' });
  }
});

// DELETE /agents/:id - remove agent profile
app.delete('/api/v1/agents/:id', async (req, res) => {
  try {
    let agents = await loadAgents();
    const idx = agents.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Agent not found' });
    agents.splice(idx, 1);
    await saveAgents(agents);
    broadcastUpdate('agent-updated');
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting agent profile:', err);
    res.status(500).json({ error: 'Failed to delete agent profile' });
  }
});

// POST /agents/:id/duplicate - clone profile
app.post('/api/v1/agents/:id/duplicate', async (req, res) => {
  try {
    const agents = await loadAgents();
    const source = agents.find((a) => a.id === req.params.id);
    if (!source) return res.status(404).json({ error: 'Agent not found' });
    const duplicate = createAgentRecord({ ...source, name: req.body.name || `${source.name} (Copy)` });
    const slug = slugifyAgentName(duplicate.name, duplicate.id);
    duplicate.agentDir = path.join(AGENT_STORAGE_DIR, slug);
    await ensureAgentWorkspaceDir(duplicate.agentDir);
    duplicate.metadata = { usageCount: 0, lastUsedAt: null };
    duplicate.attachedFiles = [];
    agents.push(duplicate);
    await Promise.all([saveAgents(agents), persistAgentProfileFile(duplicate)]);
    broadcastUpdate('agent-updated');
    res.status(201).json(duplicate);
  } catch (err) {
    console.error('Error duplicating agent profile:', err);
    res.status(500).json({ error: 'Failed to duplicate agent profile' });
  }
});

// POST /agents/:id/set-default
app.post('/api/v1/agents/:id/set-default', async (req, res) => {
  try {
    const agents = await loadAgents();
    const idx = agents.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Agent not found' });
    agents.forEach((agent) => { agent.isDefault = false; });
    agents[idx].isDefault = true;
    agents[idx].updatedAt = new Date().toISOString();
    await Promise.all([saveAgents(agents), persistAgentProfileFile(agents[idx])]);
    broadcastUpdate('agent-updated');
    res.json(agents[idx]);
  } catch (err) {
    console.error('Error setting default agent:', err);
    res.status(500).json({ error: 'Failed to set default agent' });
  }
});

// POST /agents/import - import JSON definition
app.post('/api/v1/agents/import', async (req, res) => {
  try {
    const agents = await loadAgents();
    const imported = createAgentRecord(req.body);
    const slug = slugifyAgentName(imported.name, imported.id);
    imported.agentDir = path.join(AGENT_STORAGE_DIR, slug);
    await ensureAgentWorkspaceDir(imported.agentDir);
    agents.push(imported);
    await Promise.all([saveAgents(agents), persistAgentProfileFile(imported)]);
    broadcastUpdate('agent-updated');
    res.status(201).json(imported);
  } catch (err) {
    console.error('Error importing agent profile:', err);
    res.status(500).json({ error: 'Failed to import agent profile' });
  }
});

// GET /agents/:id/export - return profile data (without metadata)
app.get('/api/v1/agents/:id/export', async (req, res) => {
  try {
    const agents = await loadAgents();
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const { metadata, attachedFiles, ...exportData } = agent;
    res.json(exportData);
  } catch (err) {
    console.error('Error exporting agent profile:', err);
    res.status(500).json({ error: 'Failed to export agent profile' });
  }
});

// GET /agents/:id/stats
app.get('/api/v1/agents/:id/stats', async (req, res) => {
  try {
    const agents = await loadAgents();
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ id: agent.id, name: agent.name, ...agent.metadata });
  } catch (err) {
    console.error('Error fetching agent stats:', err);
    res.status(500).json({ error: 'Failed to load agent stats' });
  }
});

// POST /agents/:id/files/attach
app.post('/api/v1/agents/:id/files/attach', async (req, res) => {
  try {
    const { sourcePath } = req.body;
    if (!sourcePath) return res.status(400).json({ error: 'sourcePath is required' });
    const agents = await loadAgents();
    const idx = agents.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Agent not found' });
    const agent = agents[idx];
    if (!agent.agentDir) return res.status(400).json({ error: 'Agent directory missing' });
    const absSource = sourcePath.replace(/^~/, process.env.HOME);
    const filesDir = path.join(agent.agentDir, 'files');
    await ensureAgentWorkspaceDir(agent.agentDir);
    const fileName = path.basename(absSource);
    const destPath = path.join(filesDir, `${Date.now()}-${fileName}`);
    await fs.copyFile(absSource, destPath);
    const stats = await fs.stat(destPath);
    const fileEntry = {
      id: uuidv4(),
      name: fileName,
      path: destPath,
      size: stats.size,
      attachedAt: new Date().toISOString()
    };
    agent.attachedFiles = agent.attachedFiles || [];
    agent.attachedFiles.push(fileEntry);
    agent.updatedAt = new Date().toISOString();
    agents[idx] = agent;
    await Promise.all([saveAgents(agents), persistAgentProfileFile(agent)]);
    broadcastUpdate('agent-updated');
    res.json(fileEntry);
  } catch (err) {
    console.error('Error attaching file to agent:', err);
    res.status(500).json({ error: 'Failed to attach file' });
  }
});

// DELETE /agents/:id/files/:fileId
app.delete('/api/v1/agents/:id/files/:fileId', async (req, res) => {
  try {
    const agents = await loadAgents();
    const idx = agents.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Agent not found' });
    const agent = agents[idx];
    const fileIdx = (agent.attachedFiles || []).findIndex((f) => f.id === req.params.fileId);
    if (fileIdx === -1) return res.status(404).json({ error: 'File not found' });
    const file = agent.attachedFiles[fileIdx];
    try { await fs.unlink(file.path); } catch (e) {}
    agent.attachedFiles.splice(fileIdx, 1);
    agent.updatedAt = new Date().toISOString();
    agents[idx] = agent;
    await Promise.all([saveAgents(agents), persistAgentProfileFile(agent)]);
    broadcastUpdate('agent-updated');
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting attached file:', err);
    res.status(500).json({ error: 'Failed to delete attached file' });
  }
});


// ============================================
// SPA CATCH-ALL ROUTE (for React Router)
// ============================================

// Catch-all for React SPA client-side routing (must be AFTER all API routes)
app.get('*', async (req, res) => {
  // Skip API routes and static assets
  if (req.path.startsWith('/api') || req.path.startsWith('/outputs') || req.path.startsWith('/thumbnails')) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const hasReactBuild = await serveReactBuild();
    if (hasReactBuild) {
      const indexPath = path.join(REACT_BUILD_DIR, 'index.html');
      const html = await fs.readFile(indexPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      // Fallback to legacy dashboard
      const dashboardPath = path.join(CONFIG.BASE_DIR, 'agent-dashboard.html');
      const html = await fs.readFile(dashboardPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    }
  } catch (err) {
    res.status(404).send('Page not found');
  }
});

// ============================================
// INITIALIZATION
// ============================================

async function initialize() {
  // Create necessary directories
  const dirs = [
    CONFIG.OUTPUTS_DIR,
    CONFIG.THUMBNAILS_DIR,
    CONFIG.OBSIDIAN_VAULT,
    path.join(CONFIG.OBSIDIAN_VAULT, 'today'),
    path.join(CONFIG.OBSIDIAN_VAULT, 'tomorrow'),
    path.join(CONFIG.OBSIDIAN_VAULT, 'backlog'),
    path.join(CONFIG.OBSIDIAN_VAULT, 'done')
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') console.warn(`Could not create ${dir}:`, err.message);
    }
  }
  
  // Initialize storage files if they don't exist
  if (!(await readJson(CONFIG.TASKS_FILE))) {
    await saveTasks([]);
  }
  if (!(await readJson(CONFIG.FILES_FILE))) {
    await saveFiles([]);
  }
  if (!(await readJson(CONFIG.EVENTS_FILE))) {
    await saveEvents([]);
  }
  if (!(await readJson(CONFIG.ACTIVE_SESSIONS_FILE))) {
    await writeJson(CONFIG.ACTIVE_SESSIONS_FILE, { version: '1.0', lastUpdated: new Date().toISOString(), sessions: [] });
  }
  if (!(await readJson(CONFIG.PAST_SESSIONS_FILE))) {
    await writeJson(CONFIG.PAST_SESSIONS_FILE, { version: '1.0', lastUpdated: new Date().toISOString(), sessions: [] });
  }
  if (!(await readJson(CONFIG.EXECUTION_QUEUE_FILE))) {
    await writeJson(CONFIG.EXECUTION_QUEUE_FILE, { version: '1.0', lastUpdated: new Date().toISOString(), jobs: [] });
  }
  
  await seedDefaultAgentProfiles();

  // Initialize plan storage infrastructure (Phase 1)
  await initializePlanStorage();
  
  // Restore persisted sessions and queue
  await restoreActiveSessions();
  await restorePastSessions();
  await restoreExecutionQueue();
  await reconcileTaskStates();
  await processExecutionQueue();
  
  // DISABLED: File watcher for Obsidian sync - caused flickering/state conflicts
  // await initFileWatcher();
  
  // DISABLED: Periodic Obsidian sync (every 30 seconds) - manual sync only
  // setInterval(async () => {
  //   try {
  //     // await pullFromObsidian(); // DISABLED
  //   } catch (err) {
  //     console.warn('Periodic sync failed:', err.message);
  //   }
  // }, CONFIG.SYNC_INTERVAL_MS);
  
  console.log('📋 Obsidian sync: Manual push only (auto-sync disabled)');
  
  // Log server start
  await logEvent({
    type: 'system',
    severity: 'success',
    title: 'Server started',
    description: `Kanban API server listening on port ${PORT}`,
    metadata: { port: PORT }
  });
  
  console.log(`🚀 Kanban API Server running at http://localhost:${PORT}/api/v1`);
  console.log(`📡 WebSocket server ready at ws://localhost:${PORT}`);
  console.log(`📁 Obsidian vault: ${CONFIG.OBSIDIAN_VAULT}`);
  console.log(`📋 Plan storage: ${PLANS_CONFIG.BASE_DIR}`);
}

// Start the server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Kanban API Server running at http://127.0.0.1:${PORT}/api/v1`);
  console.log(`📡 WebSocket: ws://127.0.0.1:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

initialize().catch(err => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
});

module.exports = app;
