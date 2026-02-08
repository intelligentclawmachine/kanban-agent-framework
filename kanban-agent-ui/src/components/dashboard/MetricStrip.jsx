import React from 'react'

function MetricStrip({ metrics }) {
  if (!metrics || metrics.length === 0) return null

  return (
    <section className="metrics-strip-new" aria-label="Live metrics">
      <div className="metrics-carousel">
        {metrics.map((metric) => (
          <article key={metric.id} className={`metric-card-new metric-${metric.tone}`}>
            <div className="metric-icon" aria-hidden="true">
              {metric.icon}
            </div>
            <div className="metric-text">
              <p className="metric-label">{metric.label}</p>
              <h3 className="metric-value-new">{metric.value}</h3>
              {metric.delta && <p className="metric-delta">{metric.delta}</p>}
              {metric.description && <p className="metric-description">{metric.description}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default MetricStrip
