import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import { useToast } from '../Toast'
import { AGENT_TYPES } from '../../utils/constants'
import client from '../../api/client'
import './TaskModal.css'

const DEFAULT_OUTPUT_FOLDER = '~/Desktop/Claw Creations/outputs'

function TaskModal() {
  const { taskModalOpen, taskModalData, closeTaskModal } = useUIStore()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toast = useToast()

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    status: 'backlog',
    dueDate: '',
    agentType: 'auto',
    planFirst: false,
    outputFolder: DEFAULT_OUTPUT_FOLDER,
    expectedOutput: '',
  })

  React.useEffect(() => {
    if (taskModalData) {
      setFormData({
        title: taskModalData.title || '',
        description: taskModalData.description || '',
        status: taskModalData.status || 'backlog',
        dueDate: taskModalData.dueDate ? taskModalData.dueDate.split('T')[0] : '',
        agentType: taskModalData.agentType || 'auto',
        planFirst: taskModalData.planFirst === true,
        outputFolder: taskModalData.outputFolder || DEFAULT_OUTPUT_FOLDER,
        expectedOutput: taskModalData.expectedOutput || '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        status: taskModalData?.status || 'backlog',
        dueDate: '',
        agentType: 'auto',
        planFirst: false,
        outputFolder: DEFAULT_OUTPUT_FOLDER,
        expectedOutput: '',
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
      planFirst: formData.planFirst,
      outputFolder: formData.outputFolder.trim() || DEFAULT_OUTPUT_FOLDER,
      expectedOutput: formData.expectedOutput.trim() || null,
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
                {pickingFolder ? '...' : '📂 Browse'}
              </button>
            </div>
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
              <label htmlFor="taskAgentType">Agent Type</label>
              <select
                id="taskAgentType"
                className="form-input"
                value={formData.agentType}
                onChange={(event) => setFormData((prev) => ({ ...prev, agentType: event.target.value }))}
              >
                {AGENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
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
