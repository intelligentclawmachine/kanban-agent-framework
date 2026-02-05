/**
 * Production Agent Spawner Module
 * Replaces all simulation code with real OpenClaw agent execution
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * Spawn an agent and wait for completion
 * Uses OpenClaw sessions_spawn to run real agents
 */
async function spawnAgentWithResult({
  task,
  outputPath,
  model = 'openrouter/moonshotai/kimi-k2.5',
  timeoutSeconds = 300,
  agentType = 'auto'
}) {
  const startTime = Date.now();
  const sessionLabel = `agent-${Date.now()}`;
  
  console.log(`🤖 Spawning agent for task: ${task.substring(0, 100)}...`);
  console.log(`   Model: ${model}`);
  console.log(`   Output: ${outputPath}`);
  
  try {
    // Create output directory if needed
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Build the full prompt with instructions
    const fullPrompt = `${task}

---

**REQUIRED OUTPUT FORMAT:**
You must end your response with exactly this format:

STEP_COMPLETE
Result: [Detailed description of what you accomplished]
Files Created: [List each file with full path, one per line, or "None"]
URLs: [List each URL, one per line, or "None"]  
Notes: [Any important details, errors, or context]

OR if you failed:

STEP_ERROR
Result: [What you attempted]
Error: [Specific error message]
Files Created: None
URLs: None
Notes: [What went wrong]
`;

    // Write prompt to temp file for the agent
    const promptPath = path.join(outputDir, `.prompt-${Date.now()}.txt`);
    await fs.writeFile(promptPath, fullPrompt);
    
    // Use OpenClaw CLI to spawn agent
    // This runs the agent and captures output
    const agentResult = await runAgentViaOpenClaw({
      prompt: fullPrompt,
      model,
      timeoutSeconds,
      outputPath
    });
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Agent completed in ${duration}s`);
    
    // Parse the agent output
    const parsed = parseAgentOutput(agentResult.output);
    
    // Check if output file was created as success indicator
    let outputFileExists = false;
    try {
      await fs.access(outputPath);
      outputFileExists = true;
    } catch (e) {
      // File doesn't exist
    }
    
    // Verify files exist
    if (parsed.files && parsed.files.length > 0) {
      const verifiedFiles = [];
      for (const filePath of parsed.files) {
        try {
          await fs.access(filePath.replace('~/', process.env.HOME + '/'));
          verifiedFiles.push(filePath);
        } catch (e) {
          console.warn(`   ⚠️ File claimed but not found: ${filePath}`);
        }
      }
      parsed.files = verifiedFiles;
    }
    
    // Clean up prompt file
    try { await fs.unlink(promptPath); } catch (e) {}
    
    // Success if: output file exists, or status is complete, or exit code was 0
    const success = outputFileExists || parsed.status === 'complete' || agentResult.exitCode === 0;
    
    return {
      success: success,
      output: agentResult.output,
      result: parsed.result || (outputFileExists ? 'Output file created successfully' : 'Task completed'),
      files: parsed.files || [],
      urls: parsed.urls || [],
      notes: parsed.notes || '',
      error: parsed.error,
      duration,
      tokensUsed: agentResult.tokensUsed || 0
    };
    
  } catch (err) {
    const duration = (Date.now() - startTime) / 1000;
    console.error(`❌ Agent failed after ${duration}s:`, err.message);
    
    return {
      success: false,
      output: '',
      result: 'Agent execution failed',
      files: [],
      urls: [],
      notes: '',
      error: err.message,
      duration,
      tokensUsed: 0
    };
  }
}

/**
 * Run agent via OpenClaw CLI
 */
async function runAgentViaOpenClaw({ prompt, model, timeoutSeconds, outputPath }) {
  return new Promise((resolve, reject) => {
    const outputChunks = [];
    const errorChunks = [];
    
    // Build OpenClaw command
    // Using 'agent --local' to run agent directly without channel routing
    const sessionId = `kanban-${Date.now()}`;
    const args = [
      'agent',
      '--local',
      '--session-id', sessionId,
      '--message', prompt,
      '--timeout', timeoutSeconds.toString(),
      '--json'
    ];
    
    // Set model via environment variable if supported
    const env = {
      ...process.env,
      OPENCLAW_OUTPUT_PATH: outputPath,
      OPENCLAW_DEFAULT_MODEL: model
    };
    
    console.log(`   Executing: openclaw ${args[0]} ${args[1]} --message "..." --timeout ${timeoutSeconds}...`);
    
    const proc = spawn('openclaw', args, {
      timeout: timeoutSeconds * 1000,
      env: env
    });
    
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      outputChunks.push(chunk);
      process.stdout.write(chunk);  // Stream to console
    });
    
    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorChunks.push(chunk);
      process.stderr.write(chunk);  // Stream errors
    });
    
    proc.on('close', async (code) => {
      const output = outputChunks.join('');
      const errors = errorChunks.join('');
      
      // Try to read output file if created
      let fileOutput = '';
      try {
        fileOutput = await fs.readFile(outputPath, 'utf8');
      } catch (e) {
        // Output might be in stdout only
      }
      
      // Parse JSON output if available
      let parsedOutput = fileOutput || output;
      try {
        const jsonResult = JSON.parse(output);
        if (jsonResult.response) {
          parsedOutput = jsonResult.response;
        }
      } catch (e) {
        // Not JSON, use raw output
      }
      
      const finalOutput = parsedOutput;
      
      if (code === 0 || finalOutput.includes('STEP_COMPLETE')) {
        resolve({
          output: finalOutput,
          exitCode: code,
          tokensUsed: extractTokensFromOutput(output)
        });
      } else {
        reject(new Error(`Agent exited with code ${code}: ${errors || output}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn agent: ${err.message}`));
    });
  });
}

/**
 * Parse agent output for structured data
 */
function parseAgentOutput(output) {
  const result = {
    status: 'unknown',
    result: '',
    files: [],
    urls: [],
    notes: '',
    error: null
  };
  
  if (!output) return result;
  
  // Check for completion status
  if (output.includes('STEP_COMPLETE')) {
    result.status = 'complete';
  } else if (output.includes('STEP_ERROR')) {
    result.status = 'error';
  }
  
  // Extract Result
  const resultMatch = output.match(/Result:\s*(.+?)(?=\nFiles:|\nURLs:|\nNotes:|\nError:|$)/is);
  if (resultMatch) result.result = resultMatch[1].trim();
  
  // Extract Files Created
  const filesMatch = output.match(/Files Created:\s*(.+?)(?=\nURLs:|\nNotes:|$)/is);
  if (filesMatch) {
    const filesText = filesMatch[1].trim();
    if (filesText && filesText.toLowerCase() !== 'none') {
      result.files = filesText
        .split('\n')
        .map(f => f.trim())
        .filter(f => f && !f.startsWith('-'));
    }
  }
  
  // Extract URLs
  const urlsMatch = output.match(/URLs:\s*(.+?)(?=\nNotes:|$)/is);
  if (urlsMatch) {
    const urlsText = urlsMatch[1].trim();
    if (urlsText && urlsText.toLowerCase() !== 'none') {
      result.urls = urlsText
        .split('\n')
        .map(u => u.trim())
        .filter(u => u && u.startsWith('http'));
    }
  }
  
  // Extract Notes
  const notesMatch = output.match(/Notes:\s*(.+?)(?=\nError:|$)/is);
  if (notesMatch) result.notes = notesMatch[1].trim();
  
  // Extract Error
  const errorMatch = output.match(/Error:\s*(.+?)(?=\n|$)/is);
  if (errorMatch) result.error = errorMatch[1].trim();
  
  return result;
}

/**
 * Extract token usage from agent output
 */
function extractTokensFromOutput(output) {
  const match = output.match(/tokens used[\s:]*(\d+)/i);
  return match ? parseInt(match[1]) : 0;
}

module.exports = {
  spawnAgentWithResult,
  parseAgentOutput
};
