import React, { useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import { usePlan, useApprovePlan, useExecutePlan, useStartPlanning } from '../../hooks/usePlans'
import { useToast } from '../Toast'
import './PlanReviewModal.css'

function PlanReviewModal() {
  const { planModalOpen, planModalTaskId, closePlanModal } = useUIStore()
  const { data, isLoading, refetch } = usePlan(planModalTaskId)
  const approvePlan = useApprovePlan()
  const executePlan = useExecutePlan()
  const startPlanning = useStartPlanning()
  const toast = useToast()
  const [isApproving, setIsApproving] = useState(false)
  const [isReplanning, setIsReplanning] = useState(false)

  if (!planModalOpen) return null

  const plan = data?.plan

  const handleApprove = async () => {
    if (!planModalTaskId || isApproving) return
    setIsApproving(true)
    try {
      await approvePlan.mutateAsync(planModalTaskId)
      await executePlan.mutateAsync(planModalTaskId)
      toast.success('Plan approved - execution started')
      closePlanModal()
    } catch (err) {
      toast.error(`Failed to approve plan: ${err.message}`)
    } finally {
      setIsApproving(false)
    }
  }

  const handleRequestChanges = async () => {
    if (!planModalTaskId || isReplanning) return
    setIsReplanning(true)
    try {
      await startPlanning.mutateAsync(planModalTaskId)
      toast.info('Plan regeneration started')
      await refetch()
    } catch (err) {
      toast.error(`Failed to regenerate plan: ${err.message}`)
    } finally {
      setIsReplanning(false)
    }
  }

  return (
    <div className="modal-overlay active" id="planReviewModal" onClick={closePlanModal}>
      <div className="modal plan-review-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Plan Review</h2>
          <button className="modal-close" type="button" onClick={closePlanModal}>×</button>
        </div>
        <div className="plan-metadata">
          <div className="plan-meta-item">
            <div className="plan-meta-label">Agent</div>
            <div className="plan-meta-value">{plan?.metadata?.agentType || 'auto'}</div>
          </div>
          <div className="plan-meta-item">
            <div className="plan-meta-label">Created</div>
            <div className="plan-meta-value">
              {plan?.metadata?.createdAt ? new Date(plan.metadata.createdAt).toLocaleString() : '-'}
            </div>
          </div>
          <div className="plan-meta-item">
            <div className="plan-meta-label">Status</div>
            <div className="plan-meta-value">{plan?.metadata?.status || 'draft'}</div>
          </div>
        </div>
        <div className="plan-review-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Loading plan...</p>
            </div>
          ) : (
            <pre>{plan?.content || 'No plan content available. The plan may still be generating.'}</pre>
          )}
        </div>
        <div className="plan-actions">
          <button className="btn btn-secondary" type="button" onClick={closePlanModal}>
            Close
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleRequestChanges}
            disabled={isReplanning || isLoading}
          >
            {isReplanning ? 'Regenerating...' : 'Regenerate Plan'}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleApprove}
            disabled={isApproving || isLoading || !plan?.content}
          >
            {isApproving ? 'Approving...' : 'Approve & Execute'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlanReviewModal
