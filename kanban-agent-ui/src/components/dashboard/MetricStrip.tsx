import React from 'react'
import { MetricCard } from '../../types/dashboard'

interface MetricStripProps {
  metrics: MetricCard[]
}

const MetricStrip: React.FC<MetricStripProps> = ({ metrics }) => {
  return (
    <section className="metrics-strip" aria-label="Live metrics" aria-live="polite">
      <div className="metrics-carousel">
        {metrics.map((metric) => (
          <article key={metric.id} className={`metric-card metric-${metric.tone}`}>
            <div className="metric-icon" aria-hidden="true">
              {metric.icon}
            </div>
            <div className="metric-text">
              <p className="metric-label">{metric.label}</p>
              <h3 className="metric-value">{metric.value}</h3>
              <p className="metric-delta">{metric.delta}</p>
              <p className="metric-description">{metric.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default MetricStrip
