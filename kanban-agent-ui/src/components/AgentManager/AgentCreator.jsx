import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useCreateAgent, useUpdateAgent, useDeleteAgent, usePickFile, useAttachAgentFile, useDeleteAgentFile, useAvailableModels } from '../../hooks/useAgents'
import { useToast } from '../Toast'
import { createEmptyAgentProfile, DEFAULT_SANDBOX_CONFIG, DEFAULT_TOOL_CONFIG } from '../../types/agent'
import {
  AGENT_TYPE_OPTIONS,
  NETWORK_ACCESS_OPTIONS,
  FILESYSTEM_ACCESS_OPTIONS,
  TOOL_MODE_OPTIONS,
  TOOL_PRESETS,
  AVAILABLE_TOOLS,
  PROMPT_TEMPLATES,
  AGENT_ICONS,
  AGENT_COLORS,
} from '../../utils/agentConstants'
import './AgentCreator.css'

function AgentCreator() {
  const { agentModalOpen, agentModalData, closeAgentModal } = useUIStore()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()
  const pickFile = usePickFile()
  const attachFile = useAttachAgentFile()
  const deleteFile = useDeleteAgentFile()
  const { data: modelsData } = useAvailableModels()
  const toast = useToast()

  const isEditing = !!agentModalData?.id

  // Form state
  const [formData, setFormData] = React.useState(createEmptyAgentProfile())
  const [activeSection, setActiveSection] = React.useState('basic')
  const [showIconPicker, setShowIconPicker] = React.useState(false)

  // Initialize form when modal opens
  React.useEffect(() => {
    if (agentModalData) {
      setFormData({
        ...createEmptyAgentProfile(),
        ...agentModalData,
        sandbox: { ...DEFAULT_SANDBOX_CONFIG, ...agentModalData.sandbox },
        tools: { ...DEFAULT_TOOL_CONFIG, ...agentModalData.tools },
      })
    } else {
      setFormData(createEmptyAgentProfile())
    }
    setActiveSection('basic')
  }, [agentModalData, agentModalOpen])

  // Form update helpers
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateSandbox = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      sandbox: { ...prev.sandbox, [field]: value },
    }))
  }

  const updateFilesystemAccess = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      sandbox: {
        ...prev.sandbox,
        filesystemAccess: { ...prev.sandbox.filesystemAccess, [field]: value },
      },
    }))
  }

  const updateTools = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      tools: { ...prev.tools, [field]: value },
    }))
  }

  const updateIdentity = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      identity: { ...prev.identity, [field]: value },
    }))
  }

  const applyToolPreset = (presetId) => {
    const preset = TOOL_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        tools: { ...preset.config },
      }))
      toast.info(`Applied "${preset.name}" preset`)
    }
  }

  const applyPromptTemplate = (templateId) => {
    const template = PROMPT_TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      updateField('prompt', template.prompt)
      toast.info(`Applied "${template.name}" template`)
    }
  }

  const toggleToolInList = (toolId, listType) => {
    const list = formData.tools[listType] || []
    const newList = list.includes(toolId)
      ? list.filter((id) => id !== toolId)
      : [...list, toolId]
    updateTools(listType, newList)
  }

  const handleAttachFile = async () => {
    if (!isEditing) {
      toast.error('Save the agent first before attaching files')
      return
    }
    try {
      const result = await pickFile.mutateAsync({ currentPath: formData.agentDir })
      if (!result.success) return // user cancelled
      const fileEntry = await attachFile.mutateAsync({
        agentId: agentModalData.id,
        sourcePath: result.path,
      })
      setFormData((prev) => ({
        ...prev,
        attachedFiles: [...(prev.attachedFiles || []), fileEntry],
      }))
      toast.success(`Attached "${fileEntry.name}"`)
    } catch (err) {
      toast.error(`Failed to attach file: ${err.message}`)
    }
  }

  const handleRemoveFile = async (fileId, fileName) => {
    try {
      await deleteFile.mutateAsync({ agentId: agentModalData.id, fileId })
      setFormData((prev) => ({
        ...prev,
        attachedFiles: (prev.attachedFiles || []).filter((f) => f.id !== fileId),
      }))
      toast.success(`Removed "${fileName}"`)
    } catch (err) {
      toast.error(`Failed to remove file: ${err.message}`)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Agent name is required')
      return
    }

    if (!formData.model) {
      toast.error('Model selection is required')
      setActiveSection('model')
      return
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      prompt: formData.prompt.trim(),
      identity: {
        ...formData.identity,
        displayName: formData.identity.displayName.trim() || formData.name.trim(),
      },
    }

    try {
      if (isEditing) {
        await updateAgent.mutateAsync({ id: agentModalData.id, updates: payload })
        toast.success('Agent updated successfully')
      } else {
        await createAgent.mutateAsync(payload)
        toast.success('Agent created successfully')
      }
      closeAgentModal()
    } catch (err) {
      toast.error(`Failed to save agent: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    if (!isEditing) return
    if (!confirm(`Delete "${formData.name}"? This cannot be undone.`)) return

    try {
      await deleteAgent.mutateAsync(agentModalData.id)
      toast.success('Agent deleted')
      closeAgentModal()
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`)
    }
  }

  if (!agentModalOpen) return null

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'model', label: 'Model', icon: '🧠' },
    { id: 'behavior', label: 'Behavior', icon: '💬' },
    { id: 'environment', label: 'Environment', icon: '🔒' },
    { id: 'tools', label: 'Tools', icon: '🛠️' },
    { id: 'files', label: 'Files', icon: '📎' },
    { id: 'identity', label: 'Identity', icon: '🎭' },
    { id: 'tags', label: 'Tags', icon: '🏷️' },
  ]

  return (
    <div className="modal-overlay active" onClick={closeAgentModal}>
      <div className="agent-creator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="creator-header">
          <h2>{isEditing ? 'Edit Agent' : 'Create New Agent'}</h2>
          <button className="modal-close" type="button" onClick={closeAgentModal}>
            ×
          </button>
        </div>

        <div className="creator-body">
          {/* Section Navigation */}
          <nav className="section-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`section-nav-btn ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="section-icon">{section.icon}</span>
                <span className="section-label">{section.label}</span>
              </button>
            ))}
          </nav>

          {/* Section Content */}
          <form className="creator-form" onSubmit={handleSubmit}>
            {/* Basic Info Section */}
            {activeSection === 'basic' && (
              <div className="form-section">
                <h3>Basic Information</h3>

                <div className="form-group">
                  <label htmlFor="agentName">Name *</label>
                  <input
                    type="text"
                    id="agentName"
                    className="form-input"
                    placeholder="My Custom Agent"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="agentType">Agent Type</label>
                    <select
                      id="agentType"
                      className="form-input"
                      value={formData.type}
                      onChange={(e) => updateField('type', e.target.value)}
                    >
                      {AGENT_TYPE_OPTIONS.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Icon</label>
                    <div className="icon-picker-trigger">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setShowIconPicker(!showIconPicker)}
                      >
                        {formData.icon || '🤖'}
                      </button>
                      {showIconPicker && (
                        <div className="icon-picker-dropdown">
                          {AGENT_ICONS.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                              onClick={() => {
                                updateField('icon', icon)
                                setShowIconPicker(false)
                              }}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="agentDescription">Description</label>
                  <textarea
                    id="agentDescription"
                    className="form-textarea"
                    placeholder="A brief description of what this agent does..."
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Model Section */}
            {activeSection === 'model' && (
              <div className="form-section">
                <h3>Model Selection</h3>

                <div className="form-group">
                  <label htmlFor="agentModel">AI Model</label>
                  {modelsData?.grouped ? (
                    <select
                      id="agentModel"
                      className={`form-input${!formData.model ? ' field-warning' : ''}`}
                      value={formData.model}
                      onChange={(e) => updateField('model', e.target.value)}
                    >
                      <option value="" disabled>-- Select a model --</option>
                      {Object.entries(modelsData.grouped).map(([provider, models]) => (
                        <optgroup key={provider} label={provider}>
                          {models.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.alias}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <select id="agentModel" className="form-input" value={formData.model} disabled>
                      <option>{formData.model || 'Loading models...'}</option>
                    </select>
                  )}
                  <span className="form-hint">
                    {modelsData?.models?.find((m) => m.id === formData.model)?.id || formData.model}
                  </span>
                </div>
              </div>
            )}

            {/* Behavior Section */}
            {activeSection === 'behavior' && (
              <div className="form-section">
                <h3>Agent Behavior</h3>

                <div className="form-group">
                  <label>Prompt Templates</label>
                  <div className="template-buttons">
                    {PROMPT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className="btn btn-small btn-secondary"
                        onClick={() => applyPromptTemplate(template.id)}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="agentPrompt">System Prompt</label>
                  <textarea
                    id="agentPrompt"
                    className="form-textarea prompt-editor"
                    placeholder="Enter the system prompt that defines how this agent behaves..."
                    value={formData.prompt}
                    onChange={(e) => updateField('prompt', e.target.value)}
                    rows={12}
                  />
                </div>
              </div>
            )}

            {/* Environment Section */}
            {activeSection === 'environment' && (
              <div className="form-section">
                <h3>Execution Environment</h3>

                <div className="form-group">
                  <label htmlFor="agentWorkspace">Workspace Path</label>
                  <input
                    type="text"
                    id="agentWorkspace"
                    className="form-input"
                    placeholder="~/.openclaw/workspace"
                    value={formData.workspace}
                    onChange={(e) => updateField('workspace', e.target.value)}
                  />
                  <span className="form-hint">Working directory for this agent</span>
                </div>

                <div className="form-group">
                  <label htmlFor="agentDir">Agent Directory</label>
                  <input
                    type="text"
                    id="agentDir"
                    className="form-input"
                    placeholder="(optional)"
                    value={formData.agentDir}
                    onChange={(e) => updateField('agentDir', e.target.value)}
                  />
                  <span className="form-hint">Agent-specific files and config</span>
                </div>

                <h4>Sandbox Settings</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="networkAccess">Network Access</label>
                    <select
                      id="networkAccess"
                      className="form-input"
                      value={formData.sandbox.networkAccess}
                      onChange={(e) => updateSandbox('networkAccess', e.target.value)}
                    >
                      {NETWORK_ACCESS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fsAccess">Filesystem Access</label>
                    <select
                      id="fsAccess"
                      className="form-input"
                      value={formData.sandbox.filesystemAccess.mode}
                      onChange={(e) => updateFilesystemAccess('mode', e.target.value)}
                    >
                      {FILESYSTEM_ACCESS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="timeout">Timeout (seconds)</label>
                  <input
                    type="number"
                    id="timeout"
                    className="form-input"
                    min={30}
                    max={3600}
                    value={formData.sandbox.timeout}
                    onChange={(e) => updateSandbox('timeout', parseInt(e.target.value, 10) || 300)}
                  />
                </div>
              </div>
            )}

            {/* Tools Section */}
            {activeSection === 'tools' && (
              <div className="form-section">
                <h3>Tool Access</h3>

                <div className="form-group">
                  <label>Quick Presets</label>
                  <div className="preset-buttons">
                    {TOOL_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="btn btn-small btn-secondary"
                        onClick={() => applyToolPreset(preset.id)}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="toolMode">Access Mode</label>
                  <select
                    id="toolMode"
                    className="form-input"
                    value={formData.tools.mode}
                    onChange={(e) => updateTools('mode', e.target.value)}
                  >
                    {TOOL_MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.tools.mode === 'allowlist' && (
                  <div className="form-group">
                    <label>Allowed Tools</label>
                    <div className="tool-checklist">
                      {AVAILABLE_TOOLS.map((tool) => (
                        <label key={tool.id} className="tool-check-item">
                          <input
                            type="checkbox"
                            checked={formData.tools.allowList?.includes(tool.id)}
                            onChange={() => toggleToolInList(tool.id, 'allowList')}
                          />
                          <span className="tool-name">{tool.name}</span>
                          <span className="tool-category">{tool.category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.tools.mode === 'denylist' && (
                  <div className="form-group">
                    <label>Denied Tools</label>
                    <div className="tool-checklist">
                      {AVAILABLE_TOOLS.map((tool) => (
                        <label key={tool.id} className="tool-check-item">
                          <input
                            type="checkbox"
                            checked={formData.tools.denyList?.includes(tool.id)}
                            onChange={() => toggleToolInList(tool.id, 'denyList')}
                          />
                          <span className="tool-name">{tool.name}</span>
                          <span className="tool-category">{tool.category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Files Section */}
            {activeSection === 'files' && (
              <div className="form-section">
                <h3>Attached Files</h3>
                <p className="form-hint" style={{ marginBottom: 16 }}>
                  Attach reference files to this agent's workspace. Files are copied into the agent's folder.
                </p>

                {!isEditing && (
                  <div className="files-save-notice">
                    Save the agent first to enable file attachments.
                  </div>
                )}

                {isEditing && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAttachFile}
                    disabled={pickFile.isPending || attachFile.isPending}
                    style={{ marginBottom: 16 }}
                  >
                    {pickFile.isPending || attachFile.isPending ? 'Attaching...' : '+ Attach File'}
                  </button>
                )}

                {(formData.attachedFiles || []).length > 0 ? (
                  <div className="attached-files-list">
                    {formData.attachedFiles.map((file) => (
                      <div key={file.id} className="attached-file-item">
                        <span className="file-icon">📄</span>
                        <div className="file-info">
                          <span className="file-name">{file.name}</span>
                          <span className="file-meta">{formatFileSize(file.size)}</span>
                        </div>
                        <button
                          type="button"
                          className="file-remove-btn"
                          onClick={() => handleRemoveFile(file.id, file.name)}
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : isEditing ? (
                  <div className="files-empty">No files attached yet.</div>
                ) : null}
              </div>
            )}

            {/* Identity Section */}
            {activeSection === 'identity' && (
              <div className="form-section">
                <h3>Agent Identity</h3>

                <div className="form-group">
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    type="text"
                    id="displayName"
                    className="form-input"
                    placeholder={formData.name || 'Agent display name'}
                    value={formData.identity.displayName}
                    onChange={(e) => updateIdentity('displayName', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <div className="color-picker">
                    {AGENT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${formData.identity.color === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateIdentity('color', color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tags Section */}
            {activeSection === 'tags' && (
              <div className="form-section">
                <h3>Tags</h3>

                <div className="form-group">
                  <label htmlFor="tagInput">Add Tags</label>
                  <input
                    type="text"
                    id="tagInput"
                    className="form-input"
                    placeholder="Type a tag and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const tag = e.target.value.trim().toLowerCase()
                        if (tag && !formData.tags.includes(tag)) {
                          updateField('tags', [...formData.tags, tag])
                          e.target.value = ''
                        }
                      }
                    }}
                  />
                </div>

                {formData.tags.length > 0 && (
                  <div className="tags-display">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        #{tag}
                        <button
                          type="button"
                          className="tag-remove"
                          onClick={() => updateField('tags', formData.tags.filter((t) => t !== tag))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="creator-footer">
              {isEditing && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleteAgent.isPending}
                >
                  Delete Agent
                </button>
              )}
              <div className="footer-spacer" />
              <button type="button" className="btn btn-secondary" onClick={closeAgentModal}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createAgent.isPending || updateAgent.isPending}
              >
                {createAgent.isPending || updateAgent.isPending
                  ? 'Saving...'
                  : isEditing
                    ? 'Save Changes'
                    : 'Create Agent'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AgentCreator
