import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { PRIORITIES } from '../../utils/constants'
import './FilterBar.css'

function FilterBar() {
  const filterPriority = useUIStore((state) => state.filterPriority)
  const setFilterPriority = useUIStore((state) => state.setFilterPriority)

  return (
    <div className="filter-bar" id="filterBar">
      <button
        className={`filter-chip ${filterPriority === 'all' ? 'active' : ''}`}
        type="button"
        onClick={() => setFilterPriority('all')}
      >
        All
      </button>
      {PRIORITIES.map((priority) => (
        <button
          key={priority}
          className={`filter-chip ${filterPriority === priority ? 'active' : ''}`}
          type="button"
          onClick={() => setFilterPriority(priority)}
        >
          {priority}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button className="btn btn-small btn-secondary" type="button">⌨️ Commands</button>
      <button className="btn btn-small btn-secondary" type="button">⌨️ Shortcuts</button>
      <button className="btn btn-small btn-secondary" type="button">🌗 Theme</button>
    </div>
  )
}

export default FilterBar
