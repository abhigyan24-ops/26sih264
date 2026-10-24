// src/lib/types.ts — FD1
// Mirrors backend JSON exactly. Never invented fields.

export interface CaseSummary {
  id: number
  case_ref: string
  category: string
  status: string
  received_date: string
  sla_due_date: string
  closed_date: string | null
  priority: string
  sensitivity_flag: boolean
  hold_parallel: boolean
  next_action: string | null
  institution_id: number
  institution: string
  aicte_permanent_id: string | null
  region: string
  bureau: string
  bureau_name: string
  officer: string | null
  overdue: boolean
  open_high_overlaps: number
}

export interface DocumentRef {
  id: number
  file_name: string
  uploaded_at: string | null
  uploaded_by: number | null
}

export interface Action {
  id: number
  action_type: string
  remarks: string | null
  meta: Record<string, unknown>
  created_at: string
  bureau: string | null
  officer: string | null
  documents: DocumentRef[]
}

export interface OverlapRow {
  id: number
  level: 'high' | 'medium' | 'info'
  probability: number
  status: string
  explanation: string | null
  model_version: string | null
  other_case_id: number
  other_case_ref: string | null
}

export interface CaseDetail {
  id: number
  case_ref: string
  category: string
  status: string
  received_date: string
  sla_due_date: string
  closed_date: string | null
  priority: string
  sensitivity_flag: boolean
  hold_parallel: boolean
  next_action: string | null
  inst_match_conf: number
  description: string
  updated_at: string
  institution_id: number
  institution: string
  aicte_permanent_id: string | null
  city: string | null
  region: string
  bureau_id: number
  bureau: string
  bureau_name: string
  officer: string | null
  // SLA fields (BD6)
  sla_source: string | null
  days_open: number
  days_remaining: number | null
}

export interface CaseDetailResponse {
  case: CaseDetail
  actions: Action[]
  overlaps: OverlapRow[]
  active_siblings: Array<{
    id: number
    case_ref: string
    category: string
    status: string
    bureau: string
  }>
}

export interface Institution {
  id: number
  name: string
  aicte_permanent_id: string | null
  address: string | null
  city: string | null
  state: string | null
  region: string
  inst_type: string | null
  created_at: string
}

export interface InstitutionDetail {
  institution: Institution
  cases: Array<CaseSummary & { bureau_name: string }>
  repeat_categories: Array<{ category: string; label: string; n: number }>
  active_by_bureau: Array<{ bureau: string; bureau_name: string; open_cases: number }>
  overlaps: Array<{
    id: number
    level: string
    status: string
    probability: number
    created_at: string
    a_ref: string
    b_ref: string
  }>
  stats: { total: number; open: number; disposed: number; overdue: number }
}

export interface FilterMeta {
  bureaus: Array<{ code: string; name: string }>
  categories: Array<{ code: string; label: string }>
  regions: string[]
  statuses: string[]
}

export interface InstitutionSearchResult {
  id: number
  name: string
  aicte_permanent_id: string | null
  city: string | null
  state: string | null
  region: string
  score: number
}
