import React from 'react'
import { useEvents } from '../../hooks/useEvents'
import './EventStream.css'

function EventStream() {
  const { data } = useEvents(50)
  const events = data?.events || []

  return (
    <div className="event-panel">
      <div className="event-panel-header">
        <h3>🛰️ Event Stream</h3>
      </div>
      <div className="event-list">
        {events.length === 0 ? (
          <div className="empty-events">No recent events</div>
        ) : (
          events.map((event) => (
            <div key={event.id || `${event.timestamp}-${event.title}`} className="event-card">
              <div className="event-title">{event.title}</div>
              <div className="event-description">{event.description}</div>
              <div className="event-meta">{new Date(event.timestamp).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default EventStream
