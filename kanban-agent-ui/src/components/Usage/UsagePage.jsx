import React from 'react'
import { useUsageProviders, useGlobalSessions } from '../../hooks/useUsage'
import './UsagePage.css'

function formatCost(val) {
  if (val == null) return '$0.00'
  return '$' + val.toFixed(4)
}

function formatTokens(val) {
  if (!val) return '0'
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(1) + 'k'
  return String(val)
}

function formatExpiry(expiresMs) {
  if (!expiresMs) return null
  const now = Date.now()
  const diff = expiresMs - now
  if (diff <= 0) return { text: 'expired', status: 'expired' }
  const hours = diff / (1000 * 60 * 60)
  if (hours < 24) return { text: `exp: ${Math.round(hours)}h`, status: 'expiring' }
  const days = Math.round(hours / 24)
  return { text: `exp: ${days}d`, status: 'healthy' }
}

function formatTimeAgo(ts) {
  if (!ts) return null
  const diff = Date.now() - (typeof ts === 'string' ? new Date(ts).getTime() : ts)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function UsagePage() {
  const { data: provData, isLoading: provLoading } = useUsageProviders()
  const { data: globalData, isLoading: globalLoading } = useGlobalSessions()

  const authProfiles = provData?.authProfiles || []
  const providers = provData?.providers || []
  const totals = globalData?.totals || {}
  const byProvider = globalData?.byProvider || []
  const byModel = globalData?.byModel || []
  const recentSessions = globalData?.recentSessions || []

  return (
    <div className="usage-page">
      {/* Totals Strip */}
      <div className="usage-totals">
        <div className="metric-card-new metric-success">
          <div className="metric-icon">$</div>
          <div className="metric-text">
            <p className="metric-label">Total Cost</p>
            <p className="metric-value-new">{formatCost(totals.cost)}</p>
            <p className="metric-description">All sessions</p>
          </div>
        </div>
        <div className="metric-card-new metric-info">
          <div className="metric-icon">T</div>
          <div className="metric-text">
            <p className="metric-label">Total Tokens</p>
            <p className="metric-value-new">{formatTokens(totals.tokens)}</p>
            <p className="metric-description">Input + output + cache</p>
          </div>
        </div>
        <div className="metric-card-new metric-warning">
          <div className="metric-icon">#</div>
          <div className="metric-text">
            <p className="metric-label">Sessions</p>
            <p className="metric-value-new">{totals.sessions || 0}</p>
            <p className="metric-description">Global agent sessions</p>
          </div>
        </div>
        <div className="metric-card-new">
          <div className="metric-icon">~</div>
          <div className="metric-text">
            <p className="metric-label">Avg Cost</p>
            <p className="metric-value-new">
              {totals.sessions ? formatCost(totals.cost / totals.sessions) : '—'}
            </p>
            <p className="metric-description">Per session</p>
          </div>
        </div>
      </div>

      {/* Auth Profiles */}
      <div className="usage-section">
        <div className="usage-section-header">
          <h2>Auth Profiles</h2>
          <span className="agent-count">{authProfiles.length}</span>
        </div>
        {provLoading ? (
          <div className="usage-empty"><div className="loading-spinner" /></div>
        ) : authProfiles.length === 0 ? (
          <div className="usage-empty">
            <div className="usage-empty-icon">&#x1F511;</div>
            <p>No auth profiles configured</p>
          </div>
        ) : (
          <div className="auth-profiles-strip">
            {authProfiles.map((ap) => {
              const expiry = formatExpiry(ap.expires)
              const pillStatus = ap.isOAuth
                ? (expiry?.status || 'healthy')
                : (ap.errorCount > 2 ? 'expired' : 'healthy')
              return (
                <div className={`auth-pill ${pillStatus}`} key={ap.name}>
                  <span className="auth-pill-name">{ap.name}</span>
                  <span className="auth-pill-mode">
                    {ap.mode === 'oauth' ? 'OAUTH' : ap.mode === 'token' ? 'TOKEN' : 'API'}
                  </span>
                  {expiry && (
                    <span className={`auth-pill-expiry ${expiry.status}`}>{expiry.text}</span>
                  )}
                  {ap.lastUsed && (
                    <span className="auth-pill-last">{formatTimeAgo(ap.lastUsed)}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Model Providers */}
      <div className="usage-section">
        <div className="usage-section-header">
          <h2>Model Providers</h2>
          <span className="agent-count">{providers.length}</span>
        </div>
        {provLoading ? (
          <div className="usage-empty"><div className="loading-spinner" /></div>
        ) : providers.length === 0 ? (
          <div className="usage-empty">
            <div className="usage-empty-icon">&#x1F50C;</div>
            <p>No providers configured</p>
          </div>
        ) : (
          <div className="provider-grid">
            {providers.map((p) => {
              const provUsage = byProvider.find((bp) => bp.provider === p.provider)
              return (
                <div className="provider-card" key={p.provider}>
                  <p className="provider-card-name">{p.provider}</p>
                  <p className="provider-card-detail">
                    {p.modelCount} model{p.modelCount !== 1 ? 's' : ''}
                  </p>
                  <p className="provider-card-models">
                    {p.models?.slice(0, 3).join(', ')}
                    {p.models?.length > 3 ? ` +${p.models.length - 3}` : ''}
                  </p>
                  <p className="provider-card-cost">
                    {provUsage ? formatCost(provUsage.cost) : '$0.0000'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Model Breakdown */}
      <div className="usage-section">
        <div className="usage-section-header">
          <h2>Model Breakdown</h2>
          <span className="agent-count">{byModel.length}</span>
        </div>
        {globalLoading ? (
          <div className="usage-empty"><div className="loading-spinner" /></div>
        ) : byModel.length === 0 ? (
          <div className="usage-empty">
            <div className="usage-empty-icon">&#x1F4CA;</div>
            <p>No usage data yet</p>
          </div>
        ) : (
          <div className="usage-table-wrap">
            <table className="usage-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Provider</th>
                  <th className="num">Sessions</th>
                  <th className="num">Tokens</th>
                  <th className="num">Cost</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((m) => (
                  <tr key={`${m.provider}/${m.model}`}>
                    <td>{m.model}</td>
                    <td>{m.provider}</td>
                    <td className="num">{m.sessions}</td>
                    <td className="num">{formatTokens(m.tokens)}</td>
                    <td className="num">{formatCost(m.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="usage-section">
        <div className="usage-section-header">
          <h2>Recent Sessions</h2>
          <span className="agent-count">{recentSessions.length}</span>
        </div>
        {globalLoading ? (
          <div className="usage-empty"><div className="loading-spinner" /></div>
        ) : recentSessions.length === 0 ? (
          <div className="usage-empty">
            <div className="usage-empty-icon">&#x1F4DD;</div>
            <p>No sessions recorded yet</p>
          </div>
        ) : (
          <div className="usage-table-wrap">
            <table className="usage-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Model</th>
                  <th className="num">Messages</th>
                  <th className="num">Tokens</th>
                  <th className="num">Cost</th>
                  <th className="num">When</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s, i) => (
                  <tr key={s.sessionId || i}>
                    <td>{s.agent || 'main'}</td>
                    <td>{s.model || 'unknown'}</td>
                    <td className="num">{s.messages || 0}</td>
                    <td className="num">{formatTokens(s.tokens)}</td>
                    <td className="num">{formatCost(s.cost)}</td>
                    <td className="num">{formatTimeAgo(s.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default UsagePage
