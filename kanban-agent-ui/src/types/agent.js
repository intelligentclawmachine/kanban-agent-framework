/**
 * Agent Profile Types
 * 
 * @typedef {'coder' | 'ui-designer' | 'researcher' | 'writer' | 'planner' | 'analyst' | 'custom'} AgentType
 * 
 * @typedef {'full' | 'restricted' | 'none'} NetworkAccess
 * 
 * @typedef {'full' | 'workspace-only' | 'read-only' | 'none'} FilesystemMode
 * 
 * @typedef {Object} FilesystemAccess
 * @property {FilesystemMode} mode
 * @property {string[]} [allowedPaths]
 * @property {string[]} [deniedPaths]
 * 
 * @typedef {Object} SandboxConfig
 * @property {NetworkAccess} networkAccess
 * @property {FilesystemAccess} filesystemAccess
 * @property {number} timeout - Timeout in seconds
 * 
 * @typedef {'allowlist' | 'denylist' | 'all' | 'none'} ToolMode
 * 
 * @typedef {Object} ToolConfig
 * @property {ToolMode} mode
 * @property {string[]} [allowList]
 * @property {string[]} [denyList]
 * 
 * @typedef {Object} IdentityConfig
 * @property {string} displayName
 * @property {string} [emoji]
 * @property {string} [avatar]
 * @property {string} [color]
 * 
 * @typedef {Object} AttachedFile
 * @property {string} id
 * @property {string} name
 * @property {string} path
 * @property {number} size
 * @property {string} mimeType
 * @property {string} uploadedAt
 * 
 * @typedef {Object} AgentMetadata
 * @property {number} usageCount
 * @property {string} [lastUsedAt]
 * 
 * @typedef {Object} AgentProfile
 * @property {string} id
 * @property {string} name
 * @property {AgentType} type
 * @property {string} model - OpenRouter model identifier
 * @property {string} prompt - System prompt for agent behavior
 * @property {string} description
 * @property {string} icon - Emoji or avatar URL
 * @property {string} workspace - Working directory path
 * @property {string} agentDir - Agent-specific directory
 * @property {SandboxConfig} sandbox
 * @property {ToolConfig} tools
 * @property {IdentityConfig} identity
 * @property {string[]} tags
 * @property {AttachedFile[]} attachedFiles
 * @property {AgentMetadata} metadata
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {boolean} [isDefault] - Whether this is the default agent
 */

// Default sandbox configuration
export const DEFAULT_SANDBOX_CONFIG = {
  networkAccess: 'full',
  filesystemAccess: {
    mode: 'workspace-only',
    allowedPaths: [],
    deniedPaths: [],
  },
  timeout: 300,
}

// Default tool configuration
export const DEFAULT_TOOL_CONFIG = {
  mode: 'all',
  allowList: [],
  denyList: [],
}

// Default identity configuration
export const DEFAULT_IDENTITY_CONFIG = {
  displayName: '',
  emoji: '🤖',
  avatar: null,
  color: '#4a90d9',
}

// Create a new empty agent profile
export function createEmptyAgentProfile() {
  return {
    id: '',
    name: '',
    type: 'custom',
    model: 'openrouter/anthropic/claude-sonnet-4.5',
    prompt: '',
    description: '',
    icon: '🤖',
    workspace: '~/.openclaw/workspace',
    agentDir: '',
    sandbox: { ...DEFAULT_SANDBOX_CONFIG },
    tools: { ...DEFAULT_TOOL_CONFIG },
    identity: { ...DEFAULT_IDENTITY_CONFIG },
    tags: [],
    attachedFiles: [],
    metadata: {
      usageCount: 0,
      lastUsedAt: null,
    },
    createdAt: '',
    updatedAt: '',
    isDefault: false,
  }
}
