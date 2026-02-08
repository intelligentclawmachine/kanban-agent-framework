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
  model = 'anthropic/claude-sonnet-4-5',
  timeoutSeconds = 3600,
  agentType = 'auto',
  sessionId = null
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
    // IMPORTANT: Tell agent to output to STDOUT only, not use write/edit tools
    // for the final output. This avoids JSON serialization issues with large content.
    const fullPrompt = `${task}

---

**CRITICAL: OUTPUT TO STDOUT ONLY**
Output your final result as plain text to STDOUT. Do NOT use write or edit tools for the final output text.
The system will capture your STDOUT response and handle file writing.

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
      outputPath,
      sessionId
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
    
    // Scan output directory for files created during this agent's execution
    try {
      const entries = await fs.readdir(outputDir);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue; // Skip hidden/temp files
        const fullPath = path.join(outputDir, entry);
        try {
          const stat = await fs.stat(fullPath);
          // File created/modified during this agent's run (5s buffer before start)
          if (stat.mtimeMs >= startTime - 5000 && stat.isFile()) {
            const tildePath = fullPath.replace(process.env.HOME, '~');
            if (!parsed.files.includes(tildePath) && !parsed.files.includes(fullPath)) {
              // Skip our own internal files
              if (!entry.startsWith('step-') && !entry.startsWith('.prompt-')) {
                parsed.files.push(tildePath);
                console.log(`   📂 Discovered file: ${tildePath}`);
              }
            }
          }
        } catch (e) { /* stat failed, skip */ }
      }
    } catch (e) { /* readdir failed, non-critical */ }

    // Clean up prompt file
    try { await fs.unlink(promptPath); } catch (e) {}
    
    // Success requires real evidence: completion marker, substantial output, or created files
    const hasOutput = agentResult.output && agentResult.output.trim().length > 0;
    const hasSubstantialOutput = agentResult.output && agentResult.output.trim().length > 200;
    const hasCompletionMarker = parsed.status === 'complete';
    const hasCreatedFiles = parsed.files.length > 0;
    const success = hasCompletionMarker || hasSubstantialOutput || hasCreatedFiles;

    if (!success && hasOutput) {
      console.warn(`   ⚠️ Agent produced output (${agentResult.output.trim().length} chars) but it appears incomplete — no STEP_COMPLETE marker, output < 200 chars, no files created`);
    }
    
    return {
      success: success,
      output: agentResult.output,
      result: parsed.result || (hasCreatedFiles ? 'Output file created successfully' : 'Task completed'),
      files: parsed.files || [],
      urls: parsed.urls || [],
      notes: parsed.notes || '',
      error: parsed.error,
      duration,
      tokensUsed: agentResult.tokensUsed || 0,
      openclawSessionId: agentResult.openclawSessionId || null
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
async function runAgentViaOpenClaw({ prompt, model, timeoutSeconds, outputPath, sessionId: externalSessionId }) {
  return new Promise((resolve, reject) => {
    const outputChunks = [];
    const errorChunks = [];

    // Build OpenClaw command
    // Using 'agent --local' to run agent directly without channel routing
    const sessionId = externalSessionId || `kanban-${Date.now()}`;
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
      env: env
    });

    // Manual timeout since spawn() does not support the timeout option
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      console.warn(`   ⏰ Agent timed out after ${timeoutSeconds}s, killing process`);
      proc.kill('SIGTERM');
      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch (e) {}
      }, 5000);
    }, timeoutSeconds * 1000);

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
      clearTimeout(timer);
      const output = outputChunks.join('');
      const errors = errorChunks.join('');
      
      // Try to read output file if created
      let fileOutput = '';
      try {
        fileOutput = await fs.readFile(outputPath, 'utf8');
      } catch (e) {
        // Output might be in stdout only
      }
      
      // Extract actual content from agent output, stripping JSON metadata envelope
      let parsedOutput = fileOutput || output;
      try {
        const jsonResult = JSON.parse(output);
        // Handle various OpenClaw JSON response formats
        if (jsonResult.response) {
          parsedOutput = jsonResult.response;
        } else if (jsonResult.payloads && Array.isArray(jsonResult.payloads)) {
          // OpenClaw wraps output in payloads[].content
          parsedOutput = jsonResult.payloads
            .map(p => p.content || p.text || '')
            .filter(c => c)
            .join('\n');
        } else if (jsonResult.content) {
          parsedOutput = jsonResult.content;
        } else if (jsonResult.result) {
          parsedOutput = jsonResult.result;
        }
      } catch (e) {
        // Not valid JSON — mixed content with JSON metadata embedded
        // Before stripping, rescue content from embedded "content"/"text" fields
        const rescuedContent = [];
        const contentRegex = /"(?:content|text)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        let contentMatch;
        while ((contentMatch = contentRegex.exec(parsedOutput)) !== null) {
          const val = contentMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
          // Only rescue substantial content (>100 chars), skip metadata values
          if (val.length > 100) {
            rescuedContent.push(val);
          }
        }

        // Strip metadata from the original text
        let cleaned = stripJsonMetadata(parsedOutput);

        // If stripping left very little but we rescued substantial content, use it
        if (rescuedContent.length > 0 && cleaned.length < 500) {
          parsedOutput = rescuedContent.join('\n\n') + '\n\n' + cleaned;
        } else {
          parsedOutput = cleaned;
        }
      }

      // Always strip any remaining JSON metadata as a safety net
      const finalOutput = stripJsonMetadata(parsedOutput);

      // Write captured output to file ourselves (bypass JSON serialization issues)
      if (finalOutput && outputPath) {
        try {
          await fs.writeFile(outputPath, finalOutput, 'utf8');
        } catch (writeErr) {
          console.warn(`   ⚠️ Could not write output file: ${writeErr.message}`);
        }
      }
      
      if (killed) {
        reject(new Error(`Agent timed out after ${timeoutSeconds}s`));
      } else if (finalOutput.includes('STEP_COMPLETE')) {
        // STEP_COMPLETE marker is the source of truth — even if exit code is non-zero
        resolve({
          output: finalOutput,
          exitCode: code,
          tokensUsed: extractTokensFromOutput(output),
          openclawSessionId: sessionId
        });
      } else if (code === 0 && !finalOutput && !fileOutput) {
        // Process exited cleanly but produced no output — treat as failure
        reject(new Error('Agent exited with code 0 but produced no output (possible crash or missing binary)'));
      } else if (code === 0) {
        resolve({
          output: finalOutput,
          exitCode: code,
          tokensUsed: extractTokensFromOutput(output),
          openclawSessionId: sessionId
        });
      } else {
        reject(new Error(`Agent exited with code ${code}: ${errors || output}`));
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn agent: ${err.message}`));
    });
  });
}

/**
 * Strip JSON metadata blocks that OpenClaw injects into agent output.
 * Agent responses get wrapped with payloads/meta structures containing
 * session IDs, model info, usage stats, etc. This removes all of that.
 */
function stripJsonMetadata(text) {
  if (!text) return '';
  let cleaned = text;

  // Remove everything from "mediaUrl" to the next step marker (✓) or end
  cleaned = cleaned.replace(/",?\s*"mediaUrl"[\s\S]*?(?=✓|$)/g, '\n');

  // Remove "meta": { ... } blocks (nested braces)
  cleaned = cleaned.replace(/"meta"\s*:\s*\{[\s\S]*?\}\s*\}/g, '');

  // Remove "payloads": [ ... ] blocks
  cleaned = cleaned.replace(/"payloads"\s*:\s*\[[\s\S]*?\]\s*/g, '');

  // Note: Removed overly-broad generic JSON key-value stripping patterns.
  // The targeted mediaUrl/meta/payloads patterns above handle real OpenClaw metadata.

  // Remove orphaned JSON structural characters on their own lines
  cleaned = cleaned.replace(/^\s*[\[\]{}],?\s*$/gm, '');

  // Remove empty JSON objects/arrays
  cleaned = cleaned.replace(/\{\s*\}/g, '');
  cleaned = cleaned.replace(/\[\s*\]/g, '');

  // Clean escaped characters
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\"/g, '"');

  // Remove excess blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
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
  parseAgentOutput,
  stripJsonMetadata
};
