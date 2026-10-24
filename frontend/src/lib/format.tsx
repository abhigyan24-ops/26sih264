// src/lib/format.tsx — FD3
// Format helpers, badge components, hooks.
// Dates parsed without new Date("YYYY-MM-DD") to avoid timezone shifts.

import { useEffect, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getCasesWithMeta, getCase, getInstitution, getFilterMeta } from './api'
import type { FilterMeta, CaseDetailResponse, InstitutionDetail } from './types'

export const DUE_SOON_DAYS = 7

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD without timezone offset. */
function parseDateParts(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = parseDateParts(s)
  if (!d) return s
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(s: string | null | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Status ────────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  registered: 'Registered',
  assigned: 'Assigned',
  under_process: 'Under Process',
  transferred: 'Transferred',
  escalated: 'Escalated',
  action_taken: 'Action Taken',
  disposed: 'Disposed',
  reopened: 'Reopened',
}

export const STATUS_STYLES: Record<string, string> = {
  received:     'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  registered:   'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  assigned:     'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  under_process:'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  transferred:  'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  escalated:    'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  action_taken: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
  disposed:     'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  reopened:     'bg-orange-500/20 text-orange-300 border border-orange-500/30',
}

// ── Badge components ──────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  )
}

export function SlaBadge({ daysRemaining, closed }: { daysRemaining: number | null; closed: boolean }) {
  if (closed) {
    return <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-slate-600/20 text-slate-400 border border-slate-600/30">Closed</span>
  }
  if (daysRemaining === null) {
    return null
  }
  if (daysRemaining < 0) {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
        Overdue {Math.abs(daysRemaining)}d
      </span>
    )
  }
  if (daysRemaining <= DUE_SOON_DAYS) {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
        Due in {daysRemaining}d
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
      On track
    </span>
  )
}

export function SensitiveBadge() {
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-rose-900/40 text-rose-300 border border-rose-700/40 font-medium">
      🔒 Sensitive
    </span>
  )
}

export function OverlapBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-medium">
      ⚠ {count} overlap{count > 1 ? 's' : ''}
    </span>
  )
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export function useCases(params: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ['cases', params],
    queryFn: () => getCasesWithMeta(params),
    placeholderData: keepPreviousData,
  })
}

export function useCase(id: number | string | undefined) {
  return useQuery<CaseDetailResponse>({
    queryKey: ['case', id],
    queryFn: () => getCase(Number(id)),
    enabled: !!id && !isNaN(Number(id)),
  })
}

export function useInstitution(id: number | string | undefined) {
  return useQuery<InstitutionDetail>({
    queryKey: ['institution', id],
    queryFn: () => getInstitution(Number(id)),
    enabled: !!id && !isNaN(Number(id)),
  })
}

export function useFilterMeta() {
  return useQuery<FilterMeta>({
    queryKey: ['filter-meta'],
    queryFn: getFilterMeta,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
