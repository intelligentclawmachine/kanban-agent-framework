import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import { useAgents } from '../../hooks/useAgents'
import { useToast } from '../Toast'
import client from '../../api/client'
import './TaskModal.css'

const DEFAULT_OUTPUT_FOLDER = '~/Desktop/Claw Creations/outputs'

function TaskModal() {
  const { taskModalOpen, taskModalData, closeTaskModal } = useUIStore()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { data: agentsData } = useAgents()
  const toast = useToast()

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    status: 'backlog',
    dueDate: '',
    agentType: 'auto',
    agentId: null,
    planFirst: false,
    telliEnabled: false,
    dedicatedOutput: true,
    outputFolder: DEFAULT_OUTPUT_FOLDER,
    expectedOutput: '',
    contextPaths: [],
  })

  // Custom agent profiles from the Agent Manager
  const customAgents = agentsData?.agents || []

  React.useEffect(() => {
    if (taskModalData) {
      setFormData({
        title: taskModalData.title || '',
        description: taskModalData.description || '',
        status: taskModalData.status || 'backlog',
        dueDate: taskModalData.dueDate ? taskModalData.dueDate.split('T')[0] : '',
        agentType: taskModalData.agentType || 'auto',
        agentId: taskModalData.agentId || null,
        planFirst: taskModalData.planFirst === true,
        telliEnabled: taskModalData.telliEnabled === true,
        dedicatedOutput: taskModalData.dedicatedOutput !== false,
        outputFolder: taskModalData.outputFolder || DEFAULT_OUTPUT_FOLDER,
        expectedOutput: taskModalData.expectedOutput || '',
        contextPaths: Array.isArray(taskModalData.contextPaths) ? taskModalData.contextPaths : [],
      })
    } else {
      setFormData({
        title: '',
        description: '',
        status: taskModalData?.status || 'backlog',
        dueDate: '',
        agentType: 'auto',
        agentId: null,
        planFirst: false,
        telliEnabled: false,
        dedicatedOutput: true,
        outputFolder: DEFAULT_OUTPUT_FOLDER,
        expectedOutput: '',
        contextPaths: [],
      })
    }
  }, [taskModalData])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      agentType: formData.agentType,
      agentId: formData.agentId,
      planFirst: formData.planFirst,
      telliEnabled: formData.telliEnabled,
      dedicatedOutput: formData.dedicatedOutput,
      outputFolder: formData.outputFolder.trim() || DEFAULT_OUTPUT_FOLDER,
      expectedOutput: formData.expectedOutput.trim() || null,
      contextPaths: formData.contextPaths,
    }

    try {
      if (taskModalData?.id) {
        await updateTask.mutateAsync({ id: taskModalData.id, updates: payload })
        toast.success('Task updated successfully')
      } else {
        await createTask.mutateAsync(payload)
        toast.success('Task created successfully')
      }
      closeTaskModal()
    } catch (err) {
      toast.error(`Failed to save task: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    if (!taskModalData?.id) return
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask.mutateAsync(taskModalData.id)
      toast.success('Task deleted successfully')
      closeTaskModal()
    } catch (err) {
      toast.error(`Failed to delete task: ${err.message}`)
    }
  }

  const [pickingFolder, setPickingFolder] = React.useState(false)
  const [pickingContext, setPickingContext] = React.useState(false)

  const handlePickFolder = async () => {
    setPickingFolder(true)
    try {
      const res = await client.post('/utils/pick-folder', { currentPath: formData.outputFolder })
      if (res.data.success && res.data.path) {
        setFormData((prev) => ({ ...prev, outputFolder: res.data.path }))
      }
    } catch (err) {
      console.error('Folder picker error:', err)
    } finally {
      setPickingFolder(false)
    }
  }

  const handlePickContextFile = async () => {
    setPickingContext(true)
    try {
      const res = await client.post('/utils/pick-file', {})
      if (res.data.success && res.data.path) {
        setFormData((prev) => ({
          ...prev,
          contextPaths: prev.contextPaths.includes(res.data.path)
            ? prev.contextPaths
            : [...prev.contextPaths, res.data.path],
        }))
      }
    } catch (err) {
      console.error('File picker error:', err)
    } finally {
      setPickingContext(false)
    }
  }

  const handlePickContextFolder = async () => {
    setPickingContext(true)
    try {
      const res = await client.post('/utils/pick-folder', {})
      if (res.data.success && res.data.path) {
        setFormData((prev) => ({
          ...prev,
          contextPaths: prev.contextPaths.includes(res.data.path)
            ? prev.contextPaths
            : [...prev.contextPaths, res.data.path],
        }))
      }
    } catch (err) {
      console.error('Folder picker error:', err)
    } finally {
      setPickingContext(false)
    }
  }

  const removeContextPath = (pathToRemove) => {
    setFormData((prev) => ({
      ...prev,
      contextPaths: prev.contextPaths.filter((p) => p !== pathToRemove),
    }))
  }

  if (!taskModalOpen) return null

  return (
    <div className="modal-overlay active" id="taskModal" onClick={closeTaskModal}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{taskModalData?.id ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" type="button" onClick={closeTaskModal}>×</button>
        </div>
        <form id="taskForm" onSubmit={handleSubmit}>
          <input type="hidden" id="taskId" value={taskModalData?.id || ''} />
          <input type="hidden" id="taskStatus" value={formData.status} />

          <div className="form-group">
            <label htmlFor="taskTitle">Title *</label>
            <input
              type="text"
              className="form-input"
              id="taskTitle"
              required
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="taskDescription">Description</label>
            <textarea
              className="form-textarea"
              id="taskDescription"
              placeholder="Add details about this task..."
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="taskExpectedOutput">Expected Output</label>
            <input
              type="text"
              className="form-input"
              id="taskExpectedOutput"
              placeholder="e.g., A summary document, A working HTML page..."
              value={formData.expectedOutput}
              onChange={(event) => setFormData((prev) => ({ ...prev, expectedOutput: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="taskOutputFolder">Output Folder</label>
            <div className="folder-picker-row">
              <input
                type="text"
                className="form-input"
                id="taskOutputFolder"
                placeholder="~/Desktop/Claw Creations/outputs"
                value={formData.outputFolder}
                onChange={(event) => setFormData((prev) => ({ ...prev, outputFolder: event.target.value }))}
              />
              <button
                className="btn btn-secondary folder-browse-btn"
                type="button"
                onClick={handlePickFolder}
                disabled={pickingFolder}
                title="Browse folders in Finder"
              >
                {pickingFolder ? '...' : 'Browse'}
              </button>
            </div>
            <label className="checkbox-row" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={formData.dedicatedOutput}
                onChange={(event) => setFormData((prev) => ({ ...prev, dedicatedOutput: event.target.checked }))}
              />
              Dedicated output subfolder
            </label>
            <span className="form-hint">Creates a subfolder named after the task inside the output folder</span>
          </div>

          <div className="form-group">
            <label>Context Files / Folders</label>
            <div className="context-picker-row">
              <button
                className="btn btn-secondary context-pick-btn"
                type="button"
                onClick={handlePickContextFile}
                disabled={pickingContext}
              >
                + File
              </button>
              <button
                className="btn btn-secondary context-pick-btn"
                type="button"
                onClick={handlePickContextFolder}
                disabled={pickingContext}
              >
                + Folder
              </button>
              {pickingContext && <span className="picking-indicator">Picking...</span>}
            </div>
            {formData.contextPaths.length > 0 && (
              <div className="context-chips">
                {formData.contextPaths.map((p) => (
                  <span key={p} className="context-chip" title={p}>
                    <span className="context-chip-text">{p.split('/').pop() || p}</span>
                    <button
                      type="button"
                      className="context-chip-remove"
                      onClick={() => removeContextPath(p)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="taskDueDate">Due Date</label>
              <input
                type="date"
                className="form-input"
                id="taskDueDate"
                value={formData.dueDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="taskAgentType">Agent</label>
              <select
                id="taskAgentType"
                className="form-input"
                value={formData.agentId ? `custom:${formData.agentId}` : ''}
                onChange={(event) => {
                  const val = event.target.value
                  if (val.startsWith('custom:')) {
                    const id = val.slice(7)
                    const agent = customAgents.find(a => a.id === id)
                    setFormData((prev) => ({
                      ...prev,
                      agentId: id,
                      agentType: agent?.type || 'custom',
                    }))
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      agentId: null,
                      agentType: 'auto',
                    }))
                  }
                }}
              >
                <option value="">Select an agent...</option>
                {customAgents.map((agent) => (
                  <option key={agent.id} value={`custom:${agent.id}`}>
                    {agent.icon || '🤖'} {agent.name}
                  </option>
                ))}
              </select>
              {customAgents.length === 0 && (
                <span className="form-hint">Create agents in Agent Manager first</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={formData.planFirst}
                onChange={(event) => setFormData((prev) => ({ ...prev, planFirst: event.target.checked }))}
              />
              Plan before execution
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={formData.telliEnabled}
                onChange={(event) => setFormData((prev) => ({ ...prev, telliEnabled: event.target.checked }))}
              />
              Allow Telli to pick up
            </label>
          </div>

          <div className="modal-actions">
            <button className="btn btn-secondary" type="button" onClick={closeTaskModal}>Cancel</button>
            {taskModalData?.id ? (
              <button className="btn btn-danger" type="button" onClick={handleDelete}>Delete</button>
            ) : null}
            <button className="btn btn-primary" type="submit">
              {createTask.isPending || updateTask.isPending ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
