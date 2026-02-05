import { formatDistanceToNowStrict } from 'date-fns'

export const formatDuration = (start) => {
  if (!start) return ''
  try {
    return formatDistanceToNowStrict(new Date(start), { addSuffix: false })
  } catch (err) {
    return ''
  }
}

export const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleString()
  } catch (err) {
    return ''
  }
}

export const formatCurrency = (value, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '$0.000'
  return `$${Number(value).toFixed(digits)}`
}
