import api from '../lib/api'

export interface CaseRiskResponse {
  risk: number | null
  basis: 'history' | 'deadline_only'
  n_history: number
}

export const getCaseRisk = async (caseId: number): Promise<CaseRiskResponse> => {
  const res = await api.get<CaseRiskResponse>(`/sla/risk/${caseId}`)
  return res.data
}

export const triggerSlaScan = async (): Promise<{
  created: number
  by_kind: Record<string, number>
  skipped_dupes: number
}> => {
  const res = await api.post('/sla/scan')
  return res.data
}
