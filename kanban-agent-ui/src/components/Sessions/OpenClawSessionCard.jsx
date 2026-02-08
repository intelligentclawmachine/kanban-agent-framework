import React from 'react'

function formatAge(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 23) {
    const d = Math.floor(h / 24)
    return `${d}d ${h % 24}h ago`
  }
  if (h > 0) return `${h}h ${m}m ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

function formatTokens(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

const KIND_CONFIG = {
  group: { icon: '\uD83D\uDC65', label: 'Group' },
  direct: { icon: '\uD83D\uDCAC', label: 'Direct' },
}

function parseSessionLabel(key) {
  // e.g. "agent:main:telegram:group:-1003800185328:topic:1" -> "telegram group (topic 1)"
  // e.g. "agent:main:main" -> "main"
  // e.g. "kanban-1770540844239" -> "kanban task"
  if (key.startsWith('kanban-')) return 'Kanban Task'
  const parts = key.replace(/^agent:main:/, '').split(':')
  if (parts[0] === 'telegram') {
    const type = parts[1] || ''
    const topic = parts.includes('topic') ? ` (topic ${parts[parts.indexOf('topic') + 1]})` : ''
    return `Telegram ${type}${topic}`
  }
  return parts.join(' ')
}

function contextPercent(total, max) {
  if (!max || !total) return 0
  return Math.round((total / max) * 100)
}

function OpenClawSessionCard({ session }) {
  const kind = KIND_CONFIG[session.kind] || KIND_CONFIG.direct
  const label = parseSessionLabel(session.key)
  const ctxPct = contextPercent(session.totalTokens, session.contextTokens)
  const isActive = session.ageMs < 600000 // < 10 min

  return (
    <div className={`openclaw-session-card ${isActive ? 'oc-active' : 'oc-idle'}`}>
      <div className="oc-card-header">
        <span className="oc-kind">{kind.icon} {kind.label}</span>
        <span className={`oc-pulse ${isActive ? 'oc-pulse-live' : ''}`}>
          {isActive ? '\uD83D\uDD25' : '\uD83D\uDCA4'}
        </span>
      </div>
      <div className="oc-card-label" title={session.key}>{label}</div>
      <div className="oc-card-model">{session.model || 'unknown'}</div>
      <div className="oc-card-stats">
        <span>{formatTokens(session.totalTokens)} tokens</span>
        <span className="oc-ctx-pct">{ctxPct}% ctx</span>
      </div>
      <div className="oc-card-bar">
        <div className="oc-ctx-fill" style={{ width: `${Math.min(ctxPct, 100)}%` }} />
      </div>
      <div className="oc-card-age">{formatAge(session.ageMs)}</div>
    </div>
  )
}

export default OpenClawSessionCard
