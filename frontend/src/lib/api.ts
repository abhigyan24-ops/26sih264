import axios from 'axios'
import type { CaseSummary, FilterMeta, ResolveInstitutionResult, CaseCreateResponse } from './types'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

// Attach token from localStorage to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auto-logout on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── FD2: Specialized API helpers ──────────────────────────────────────────

export async function apiWithMeta<T>(url: string, params?: Record<string, unknown>): Promise<{ data: T; total: number }> {
  const resp = await api.get<T>(url, { params })
  const totalHeader = resp.headers['x-total-count']
  const total = totalHeader != null ? parseInt(String(totalHeader), 10) : (Array.isArray(resp.data) ? resp.data.length : 0)
  return { data: resp.data, total: isNaN(total) ? 0 : total }
}

export async function apiUpload(actionId: number, file: File): Promise<{ id: number; file_name: string }> {
  const formData = new FormData()
  formData.append('file', file)
  // FD2 (b): post FormData WITHOUT setting Content-Type (browser adds boundary)
  const { data } = await api.post<{ id: number; file_name: string }>(`/actions/${actionId}/documents`, formData)
  return data
}

export async function downloadDocument(id: number, fileName: string): Promise<void> {
  // FD2 (c): fetch with Authorization header, blob download
  const response = await api.get(`/documents/${id}`, { responseType: 'blob' })
  const ct = response.headers['content-type']
  const blob = new Blob([response.data], ct ? { type: String(ct) } : undefined)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// ── Auth ───────────────────────────────────────────────────────────────────
export const login = async (username: string, password: string) => {
  const form = new URLSearchParams({ username, password })
  const { data } = await api.post('/auth/login', form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return data as { access_token: string; token_type: string }
}

export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export const me = async (): Promise<{
  id: number
  username: string
  full_name: string
  role: string
  bureau_id: number | null
  region: string | null
}> => {
  const { data } = await api.get('/auth/me')
  return data
}

// ── Meta ──────────────────────────────────────────────────────────────────
export const getFilterMeta = async (): Promise<FilterMeta> => {
  const { data } = await api.get('/meta/filters')
  return data
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export const getDashboard = async () => {
  const { data } = await api.get('/dashboard')
  return data
}

// ── Cases ─────────────────────────────────────────────────────────────────
export const getCases = async (params: Record<string, string | number | boolean | undefined>) => {
  const { data } = await api.get('/cases', { params })
  return data as any[]
}

export const getCasesWithMeta = async (params: Record<string, string | number | boolean | undefined>) => {
  return apiWithMeta<CaseSummary[]>('/cases', params)
}

export const getCase = async (id: number) => {
  const { data } = await api.get(`/cases/${id}`)
  return data
}

// ── Institutions ──────────────────────────────────────────────────────────
export const searchInstitutions = async (q: string) => {
  const { data } = await api.get('/institutions/search', { params: { q } })
  return data as any[]
}

export const getInstitution = async (id: number) => {
  const { data } = await api.get(`/institutions/${id}`)
  return data
}

// ── Overlaps ──────────────────────────────────────────────────────────────
export const getOverlaps = async (status = 'suggested', level?: string) => {
  const { data } = await api.get('/overlaps', { params: { status, level } })
  return data as any[]
}

export const decideOverlap = async (
  id: number,
  body: { decision: string; lead_bureau?: string; hold_other?: boolean; reason?: string }
) => {
  const { data } = await api.post(`/overlaps/${id}/decide`, body)
  return data
}

// ── Alerts ────────────────────────────────────────────────────────────────
export const getAlerts = async (unreadOnly = false) => {
  const { data } = await api.get('/alerts', { params: { unread_only: unreadOnly } })
  return data as any[]
}

export const markAlertRead = async (id: number) => api.post(`/alerts/${id}/read`)
export const markAllRead = async () => api.post('/alerts/read-all')

// ── Reports ───────────────────────────────────────────────────────────────
export const getAgeing = async () => {
  const { data } = await api.get('/reports/ageing')
  return data as any[]
}

// ── Admin ─────────────────────────────────────────────────────────────────
export const getPolicy = async () => {
  const { data } = await api.get('/policy')
  return data
}

export const setPolicy = async (scope: string, value: string) => {
  const { data } = await api.put('/policy', { scope, value })
  return data
}

export const getModelVersions = async () => {
  const { data } = await api.get('/model-versions')
  return data as any[]
}

export const getParameterRegistry = async () => {
  const { data } = await api.get('/parameter-registry')
  return data as any[]
}

export const resolveInstitution = async (
  name: string,
  city?: string,
  aicte_id?: string
): Promise<ResolveInstitutionResult> => {
  const { data } = await api.get('/institutions/resolve', {
    params: { name, city: city || undefined, aicte_id: aicte_id || undefined },
  })
  return data
}

export const createCase = async (caseData: {
  institution_name: string
  institution_id?: number | null
  aicte_id?: string
  city?: string
  category: string
  description: string
  bureau_code: string
  sensitive?: boolean
  priority?: string
}): Promise<CaseCreateResponse> => {
  const { data } = await api.post('/cases', caseData)
  return data
}

export const addCaseAction = async (caseId: number, actionData: {
  action_type: string
  remarks?: string
  transfer_to?: string
  to_bureau?: string
  new_status?: string
}) => {
  const payload = {
    action_type: actionData.action_type,
    remarks: actionData.remarks,
    new_status: actionData.new_status,
    transfer_to: actionData.transfer_to || actionData.to_bureau,
  }
  const { data } = await api.post<{ ok: boolean; action_id: number }>(`/cases/${caseId}/actions`, payload)
  return data
}

export const getEvaluationReport = async () => {
  const { data } = await api.get('/evaluation-report')
  return data
}
