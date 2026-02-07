import React, { useEffect, useRef } from 'react'
import { ArchiveItem } from '../../types/dashboard'

interface ArchiveModalProps {
  isOpen: boolean
  items: ArchiveItem[]
  onClose: () => void
}

const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, items, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = isOpen ? 'hidden' : ''
    if (isOpen) {
      dialogRef.current?.focus()
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="archive-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-title"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="modal-header">
          <div>
            <h2 id="archive-title">Archive inbox</h2>
            <p className="modal-subtitle">Restore or purge archived tasks.</p>
          </div>
          <button type="button" className="ghost-mini" onClick={onClose} aria-label="Close archive panel">
            ✕
          </button>
        </header>
        <div className="archive-list">
          {items.map((item) => (
            <article key={item.id} className="archive-item">
              <div>
                <p className="archive-title">{item.title}</p>
                <p className="archive-meta">
                  {item.owner} • {item.archivedOn}
                </p>
                <p className="archive-extra">{item.extra}</p>
              </div>
              <div className="archive-actions">
                <span className="priority-pill">{item.priority}</span>
                <button type="button" className="secondary-pill">
                  Restore
                </button>
                <button type="button" className="danger-mini">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ArchiveModal
