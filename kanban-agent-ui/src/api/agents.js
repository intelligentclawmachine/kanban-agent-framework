import client from './client'

/**
 * Agent Manager API
 */
export const agentsApi = {
  /**
   * Get all agent profiles
   * @param {Object} filters - Optional filters
   * @param {string} [filters.type] - Filter by agent type
   * @param {string} [filters.search] - Search by name/description
   * @param {string[]} [filters.tags] - Filter by tags
   * @param {string} [filters.sort] - Sort field (name, usage, createdAt)
   * @param {string} [filters.order] - Sort order (asc, desc)
   */
  getAll: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.type) params.append('type', filters.type)
    if (filters.search) params.append('search', filters.search)
    if (filters.tags?.length) params.append('tags', filters.tags.join(','))
    if (filters.sort) params.append('sort', filters.sort)
    if (filters.order) params.append('order', filters.order)
    const query = params.toString()
    const url = query ? `/agents?${query}` : '/agents'
    return client.get(url).then((res) => res.data)
  },

  /**
   * Get a single agent profile by ID
   * @param {string} id - Agent ID
   */
  getById: (id) => client.get(`/agents/${id}`).then((res) => res.data),

  /**
   * Create a new agent profile
   * @param {Object} agentData - Agent profile data
   */
  create: (agentData) => client.post('/agents', agentData).then((res) => res.data),

  /**
   * Update an existing agent profile
   * @param {string} id - Agent ID
   * @param {Object} updates - Partial update data
   */
  update: (id, updates) => client.patch(`/agents/${id}`, updates).then((res) => res.data),

  /**
   * Delete an agent profile
   * @param {string} id - Agent ID
   */
  delete: (id) => client.delete(`/agents/${id}`).then((res) => res.data),

  /**
   * Duplicate an agent profile
   * @param {string} id - Source agent ID
   * @param {string} [newName] - Optional new name for the duplicate
   */
  duplicate: (id, newName) =>
    client.post(`/agents/${id}/duplicate`, { name: newName }).then((res) => res.data),

  /**
   * Set an agent as the default
   * @param {string} id - Agent ID to set as default
   */
  setDefault: (id) => client.post(`/agents/${id}/set-default`).then((res) => res.data),

  /**
   * Open native file picker and return selected file info
   * @param {Object} [options] - Options
   * @param {string} [options.currentPath] - Default directory
   * @param {string[]} [options.allowedTypes] - Allowed file type extensions
   */
  pickFile: (options = {}) =>
    client.post('/utils/pick-file', options).then((res) => res.data),

  /**
   * Attach a file (by path) to an agent - copies file into agent folder
   * @param {string} agentId - Agent ID
   * @param {string} sourcePath - Path to the file (from pickFile)
   */
  attachFile: (agentId, sourcePath) =>
    client.post(`/agents/${agentId}/files/attach`, { sourcePath }).then((res) => res.data),

  /**
   * Delete a file attachment from an agent
   * @param {string} agentId - Agent ID
   * @param {string} fileId - File ID to delete
   */
  deleteFile: (agentId, fileId) =>
    client.delete(`/agents/${agentId}/files/${fileId}`).then((res) => res.data),

  /**
   * Export an agent profile as JSON
   * @param {string} id - Agent ID
   */
  export: (id) => client.get(`/agents/${id}/export`).then((res) => res.data),

  /**
   * Import an agent profile from JSON
   * @param {Object} agentData - Exported agent data
   */
  import: (agentData) => client.post('/agents/import', agentData).then((res) => res.data),

  /**
   * Get agent usage statistics
   * @param {string} id - Agent ID
   */
  getStats: (id) => client.get(`/agents/${id}/stats`).then((res) => res.data),

  /**
   * Get all unique tags across all agents
   */
  getAllTags: () => client.get('/agents/tags').then((res) => res.data),

  /**
   * Get available models (filtered by auth credentials)
   */
  getModels: () => client.get('/models').then((res) => res.data),
}
