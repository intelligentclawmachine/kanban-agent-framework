import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const MESSAGE_TO_QUERIES = {
  'task-updated': ['tasks'],
  'task-created': ['tasks'],
  'task-deleted': ['tasks'],
  'task-moved': ['tasks'],
  'task-completed': ['tasks', 'reports', 'archive'],
  'task-archived': ['tasks', 'archive'],
  'task-restored': ['tasks', 'archive'],
  'tasks-refreshed': ['tasks'],
  'session-started': ['sessions', 'tasks'],
  'session-progress': ['sessions', 'tasks'],
  'session-completed': ['sessions', 'tasks', 'reports', 'archive'],
  'session-failed': ['sessions', 'tasks', 'reports'],
  'session-ended': ['sessions', 'tasks'],
  'execution-started': ['sessions', 'tasks'],
  'execution-progress': ['sessions', 'tasks'],
  'execution-complete': ['sessions', 'tasks', 'reports', 'archive'],
  'execution-error': ['sessions', 'tasks', 'reports'],
  'plan-ready': ['plans', 'tasks'],
  'plan-approved': ['plans', 'tasks'],
  'step-model-update': ['sessions'],
  'step-tokens-update': ['sessions'],
  'report-created': ['reports'],
  'events-updated': ['events'],
}

export function useWebSocket() {
  const queryClient = useQueryClient()
  const wsRef = useRef(null)

  useEffect(() => {
    let reconnectTimeout
    let shouldReconnect = true

    const connect = () => {
      const ws = new WebSocket('ws://localhost:3001')
      wsRef.current = ws

      ws.onopen = () => {
        if (import.meta?.env?.MODE !== 'production') {
          console.log('[WebSocket] Connected')
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (import.meta?.env?.MODE !== 'production') {
            console.log('[WebSocket] Message:', message)
          }

          const queryKeys = MESSAGE_TO_QUERIES[message.type]
          if (queryKeys) {
            queryKeys.forEach((key) => {
              if (key === 'plans') {
                if (message.data?.taskId) {
                  queryClient.invalidateQueries({ queryKey: ['plans', message.data.taskId] })
                } else {
                  queryClient.invalidateQueries({ queryKey: ['plans'] })
                }
              } else {
                queryClient.invalidateQueries({ queryKey: [key] })
              }
            })
          }
        } catch (error) {
          console.error('[WebSocket] Parse error:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
      }

      ws.onclose = () => {
        if (import.meta?.env?.MODE !== 'production') {
          console.log('[WebSocket] Disconnected')
        }
        if (shouldReconnect) {
          reconnectTimeout = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      shouldReconnect = false
      clearTimeout(reconnectTimeout)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [queryClient])

  return wsRef.current
}
