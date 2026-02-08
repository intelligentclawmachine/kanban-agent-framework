import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { PRIORITIES } from '../../utils/constants'

function FilterRow() {
  const filterPriority = useUIStore((state) => state.filterPriority)
  const setFilterPriority = useUIStore((state) => state.setFilterPriority)

  const chips = [
    { key: 'all', label: 'All' },
    ...PRIORITIES.map((p) => ({ key: p, label: p })),
  ]

  return (
    <div className="filter-row-new" role="group" aria-label="Priority filters">
      <div className="chip-stack">
        {chips.map((chip) => {
          const isActive = filterPriority === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              className={`filter-chip-new ${isActive ? 'is-active' : ''}`}
              onClick={() => setFilterPriority(chip.key)}
              aria-pressed={isActive}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
      <div className="filter-actions">
        <button type="button" className="secondary-pill">
          Commands
        </button>
        <button type="button" className="secondary-pill">
          Shortcuts
        </button>
      </div>
    </div>
  )
}

export default FilterRow
