import React from 'react'
import { ToastMessage } from '../../types/dashboard'

interface ToastAreaProps {
  toasts: ToastMessage[]
}

const ToastArea: React.FC<ToastAreaProps> = ({ toasts }) => {
  return (
    <div className="toast-overlay" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast-card toast-${toast.variant}`}>
          <p className="toast-title">{toast.title}</p>
          <p className="toast-body">{toast.description}</p>
        </article>
      ))}
    </div>
  )
}

export default ToastArea
