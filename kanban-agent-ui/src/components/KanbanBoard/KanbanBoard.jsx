import React from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTasks, useMoveTask } from '../../hooks/useTasks'
import { useUIStore } from '../../store/uiStore'
import { STATUS_ORDER } from '../../utils/constants'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import './KanbanBoard.css'

function KanbanBoard() {
  const filterPriority = useUIStore((state) => state.filterPriority)
  const searchQuery = useUIStore((state) => state.searchQuery)
  const { data, isLoading, error } = useTasks()
  const moveTask = useMoveTask()
  const [activeId, setActiveId] = React.useState(null)

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const tasks = data?.tasks || []

  const filteredTasks = React.useMemo(() => {
    let current = tasks.filter((task) => task.status !== 'done')
    if (filterPriority !== 'all') {
      current = current.filter((task) => task.priority === filterPriority)
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      current = current.filter(
        (task) => task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query)
      )
    }
    return current
  }, [tasks, filterPriority, searchQuery])

  const tasksByStatus = React.useMemo(() => {
    return STATUS_ORDER.reduce((acc, status) => {
      acc[status] = filteredTasks.filter((task) => task.status === status)
      return acc
    }, {})
  }, [filteredTasks])

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over) {
      setActiveId(null)
      return
    }

    const activeTask = filteredTasks.find((task) => task.id === active.id)
    const overColumn = over.data.current?.status || over.id

    if (activeTask && activeTask.status !== overColumn) {
      moveTask.mutate({ id: active.id, status: overColumn })
    }

    setActiveId(null)
  }

  if (isLoading) {
    return <div className="kanban-loading">Loading tasks...</div>
  }

  if (error) {
    return <div className="kanban-error">Error loading tasks: {error.message}</div>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-container" id="kanbanContainer">
        {STATUS_ORDER.filter((status) => status !== 'done').map((status) => (
          <KanbanColumn key={status} status={status} tasks={tasksByStatus[status]} />
        ))}
      </div>
      <DragOverlay>
        {activeId ? <TaskCard task={filteredTasks.find((task) => task.id === activeId)} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
