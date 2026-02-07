/**
 * Agent Manager Constants
 */

// Agent type definitions with metadata
export const AGENT_TYPE_OPTIONS = [
  { value: 'coder', label: 'Coder', icon: '💻', description: 'Code generation and development' },
  { value: 'ui-designer', label: 'UI Designer', icon: '🎨', description: 'UI/UX design and frontend' },
  { value: 'researcher', label: 'Researcher', icon: '🔍', description: 'Research and analysis' },
  { value: 'writer', label: 'Writer', icon: '✍️', description: 'Content and documentation' },
  { value: 'planner', label: 'Planner', icon: '📋', description: 'Task planning and breakdown' },
  { value: 'analyst', label: 'Analyst', icon: '📊', description: 'Data analysis and insights' },
  { value: 'custom', label: 'Custom', icon: '⚙️', description: 'Custom configuration' },
]

// Available models — uses provider/model format matching openclaw.json
export const MODEL_OPTIONS = [
  {
    group: 'Anthropic',
    models: [
      { value: 'anthropic/claude-opus-4-6', label: 'Claude Opus 4.6', description: 'Most capable, complex reasoning' },
      { value: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5', description: 'Balanced performance' },
      { value: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5', description: 'Fast and affordable' },
    ],
  },
  {
    group: 'OpenAI',
    models: [
      { value: 'openai/gpt-4.1', label: 'GPT-4.1', description: 'Flagship model' },
    ],
  },
  {
    group: 'OpenRouter',
    models: [
      { value: 'openrouter/moonshotai/kimi-k2.5', label: 'Kimi K2.5', description: 'Fast, multimodal (via OpenRouter)' },
    ],
  },
]

// Flat list for quick lookup
export const ALL_MODELS = MODEL_OPTIONS.flatMap((group) => group.models)

// Network access options
export const NETWORK_ACCESS_OPTIONS = [
  { value: 'full', label: 'Full Access', description: 'Unrestricted network access' },
  { value: 'restricted', label: 'Restricted', description: 'Limited to specific domains' },
  { value: 'none', label: 'No Access', description: 'Air-gapped, no network' },
]

// Filesystem access modes
export const FILESYSTEM_ACCESS_OPTIONS = [
  { value: 'full', label: 'Full Access', description: 'Read/write anywhere' },
  { value: 'workspace-only', label: 'Workspace Only', description: 'Read/write within workspace' },
  { value: 'read-only', label: 'Read Only', description: 'Can read but not write' },
  { value: 'none', label: 'No Access', description: 'No filesystem access' },
]

// Tool access modes
export const TOOL_MODE_OPTIONS = [
  { value: 'all', label: 'All Tools', description: 'Access to all available tools' },
  { value: 'allowlist', label: 'Allow List', description: 'Only specific tools allowed' },
  { value: 'denylist', label: 'Deny List', description: 'All except specific tools' },
  { value: 'none', label: 'No Tools', description: 'No tool access' },
]

// Available tools for allow/deny lists
export const AVAILABLE_TOOLS = [
  { id: 'read', name: 'Read Files', category: 'filesystem' },
  { id: 'write', name: 'Write Files', category: 'filesystem' },
  { id: 'edit', name: 'Edit Files', category: 'filesystem' },
  { id: 'exec', name: 'Execute Commands', category: 'system' },
  { id: 'process', name: 'Manage Processes', category: 'system' },
  { id: 'web_search', name: 'Web Search', category: 'network' },
  { id: 'web_fetch', name: 'Fetch URLs', category: 'network' },
  { id: 'browser', name: 'Browser Control', category: 'network' },
  { id: 'message', name: 'Send Messages', category: 'communication' },
  { id: 'nodes', name: 'Node Control', category: 'system' },
  { id: 'canvas', name: 'Canvas', category: 'ui' },
  { id: 'image', name: 'Image Analysis', category: 'ai' },
  { id: 'tts', name: 'Text to Speech', category: 'ai' },
]

// Tool presets for quick configuration
export const TOOL_PRESETS = [
  {
    id: 'full',
    name: 'Full Access',
    description: 'All tools enabled',
    config: { mode: 'all', allowList: [], denyList: [] },
  },
  {
    id: 'read-only',
    name: 'Read Only',
    description: 'Only read and search tools',
    config: { mode: 'allowlist', allowList: ['read', 'web_search', 'web_fetch', 'image'], denyList: [] },
  },
  {
    id: 'coder',
    name: 'Coder',
    description: 'File operations and execution',
    config: { mode: 'allowlist', allowList: ['read', 'write', 'edit', 'exec', 'process', 'web_search', 'web_fetch'], denyList: [] },
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Search and read-focused',
    config: { mode: 'allowlist', allowList: ['read', 'web_search', 'web_fetch', 'browser', 'image'], denyList: [] },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Just read files',
    config: { mode: 'allowlist', allowList: ['read'], denyList: [] },
  },
  {
    id: 'none',
    name: 'No Tools',
    description: 'Pure chat, no tools',
    config: { mode: 'none', allowList: [], denyList: [] },
  },
]

// Common prompt templates
export const PROMPT_TEMPLATES = [
  {
    id: 'coder',
    name: 'Production Coder',
    prompt: `You are a senior software engineer focused on writing clean, maintainable, production-ready code.

Guidelines:
- Write clear, well-documented code
- Follow established patterns and conventions
- Handle errors gracefully
- Prioritize security and performance
- Write tests when appropriate
- Explain complex logic with comments`,
  },
  {
    id: 'researcher',
    name: 'Deep Researcher',
    prompt: `You are a thorough research analyst who provides comprehensive, well-sourced analysis.

Guidelines:
- Search for multiple perspectives
- Verify claims with reliable sources
- Acknowledge uncertainty when present
- Structure findings clearly
- Provide actionable insights
- Cite sources when possible`,
  },
  {
    id: 'ui-designer',
    name: 'UI Designer',
    prompt: `You are a skilled UI/UX designer and frontend developer specializing in modern web interfaces.

Guidelines:
- Use Tailwind CSS for styling
- Follow accessibility best practices
- Create responsive, mobile-first designs
- Use semantic HTML
- Keep interfaces clean and intuitive
- Consider user experience in all decisions`,
  },
  {
    id: 'writer',
    name: 'Technical Writer',
    prompt: `You are a professional technical writer who creates clear, well-structured documentation.

Guidelines:
- Write in clear, concise language
- Use appropriate formatting (headers, lists, code blocks)
- Define technical terms when first used
- Include examples where helpful
- Structure content logically
- Consider the target audience`,
  },
  {
    id: 'assistant',
    name: 'General Assistant',
    prompt: `You are a helpful, efficient assistant focused on completing tasks accurately and quickly.

Guidelines:
- Ask clarifying questions when needed
- Provide clear, actionable responses
- Be concise but thorough
- Prioritize accuracy over speed
- Acknowledge limitations honestly`,
  },
]

// Default agent presets removed — users create their own via Agent Manager

// Icon/emoji picker options
export const AGENT_ICONS = [
  '🤖', '💻', '🔍', '✍️', '📋', '📊', '🎨', '⚙️',
  '🧠', '🔬', '📝', '⚡', '🔧', '🛠️', '📚', '💡',
  '🎯', '🚀', '🌟', '✨', '🔥', '💪', '👁️', '🧪',
]

// Color options for agent identity
export const AGENT_COLORS = [
  '#4a90d9', // Blue
  '#4caf50', // Green
  '#ff9800', // Orange
  '#f44336', // Red
  '#9c27b0', // Purple
  '#00bcd4', // Cyan
  '#e91e63', // Pink
  '#607d8b', // Blue Grey
]
