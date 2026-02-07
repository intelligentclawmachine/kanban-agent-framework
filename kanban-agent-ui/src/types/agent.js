export const DEFAULT_SANDBOX_CONFIG = {
  networkAccess: 'full',
  filesystemAccess: { mode: 'full' },
  timeout: 300,
}

export const DEFAULT_TOOL_CONFIG = {
  mode: 'all',
  allowList: [],
  denyList: [],
}

export function createEmptyAgentProfile() {
  return {
    name: '',
    type: 'general',
    description: '',
    icon: '🤖',
    model: '',
    prompt: '',
    workspace: '',
    agentDir: '',
    sandbox: { ...DEFAULT_SANDBOX_CONFIG },
    tools: { ...DEFAULT_TOOL_CONFIG },
    identity: {
      displayName: '',
      color: '#6366f1',
    },
    tags: [],
    attachedFiles: [],
    isDefault: false,
  }
}
