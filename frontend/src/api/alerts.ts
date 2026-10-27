import api from '../lib/api'

export interface Alert {
  id: number
  kind: 'overlap_high' | 'overlap_medium' | 'pending' | 'escalation' | 'sla_risk' | 'sla_breach' | 'system'
  case_id?: number | null
  overlap_id?: number | null
  bureau_id?: number | null
  message: string
  read: boolean
  created_at: string
  case_ref?: string | null
}

export const getAlerts = async (unreadOnly = false, kind?: string, limit = 50, offset = 0): Promise<Alert[]> => {
  const params: Record<string, any> = { limit, offset }
  if (unreadOnly) params.unread_only = true
  if (kind) params.kind = kind
  const res = await api.get('/alerts', { params })
  return res.data
}

export const getUnreadAlertsCount = async (): Promise<number> => {
  const res = await api.get('/alerts/unread-count')
  return res.data.count
}

export const markAlertRead = async (id: number): Promise<void> => {
  await api.post(`/alerts/${id}/read`)
}

export const markAllAlertsRead = async (): Promise<void> => {
  await api.post('/alerts/read-all')
}
