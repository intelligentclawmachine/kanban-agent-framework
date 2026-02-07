import React from 'react'
import { FilterKey } from '../../types/dashboard'

interface FilterChipProps {
  keyLabel: FilterKey
  label: string
  icon: string
}

interface FilterRowProps {
  chips: FilterChipProps[]
  activeFilters: FilterKey[]
  onToggleFilter: (key: FilterKey) => void
  isTodayHighlight: boolean
  onToggleHighlight: () => void
}

const FilterRow: React.FC<FilterRowProps> = ({
  chips,
  activeFilters,
  onToggleFilter,
  isTodayHighlight,
  onToggleHighlight,
}) => {
  return (
    <div className="filter-row" role="group" aria-label="Priority filters">
      <div className="chip-stack">
        {chips.map((chip) => {
          const isActive = activeFilters.includes(chip.keyLabel)
          return (
            <button
              key={chip.keyLabel}
              type="button"
              className={`filter-chip ${isActive ? 'is-active' : ''}`}
              onClick={() => onToggleFilter(chip.keyLabel)}
              aria-pressed={isActive}
            >
              <span aria-hidden="true" className="chip-icon">
                {chip.icon}
              </span>
              {chip.label}
            </button>
          )
        })}
      </div>
      <div className="filter-actions">
        <button type="button" className="secondary-pill">
          ⌘ Command palette
        </button>
        <button
          type="button"
          className={`secondary-pill ${isTodayHighlight ? 'is-active' : ''}`}
          onClick={onToggleHighlight}
          aria-pressed={isTodayHighlight}
        >
          Today highlight
        </button>
      </div>
    </div>
  )
}

export default FilterRow
