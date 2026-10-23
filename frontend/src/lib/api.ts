import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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

// ── Auth ───────────────────────────────────────────────────────────────────
export const login = async (username: string, password: string) => {
  const form = new URLSearchParams({ username, password })
  const { data } = await api.post('/auth/login', form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return data as { access_token: string; token_type: string }
}

export const me = async () => {
  const { data } = await api.get('/auth/me')
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
