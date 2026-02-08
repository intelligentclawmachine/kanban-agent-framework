import React from 'react'

function ToastArea({ toasts }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="toast-overlay" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast-card toast-${toast.variant || 'info'}`}>
          <p className="toast-title">{toast.title}</p>
          {toast.description && <p className="toast-body">{toast.description}</p>}
        </article>
      ))}
    </div>
  )
}

export default ToastArea
