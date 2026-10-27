import { LockKeyhole, AlertTriangle } from 'lucide-react'
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
  received:     'bg-slate-900 text-slate-300 border-slate-700',
  registered:   'bg-blue-950/60 text-blue-300 border-blue-800',
  assigned:     'bg-blue-950/60 text-blue-300 border-blue-800',
  under_process:'bg-sky-950/60 text-sky-300 border-sky-800',
  transferred:  'bg-amber-950/60 text-amber-300 border-amber-800',
  escalated:    'bg-rose-950/60 text-rose-300 border-rose-800',
  action_taken: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
  disposed:     'bg-slate-900 text-slate-400 border-slate-700',
  reopened:     'bg-amber-950/60 text-amber-300 border-amber-800',
}

// ── Badge components ──────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-900 text-slate-300 border-slate-700'
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded border font-medium ${cls}`}>
      {label}
    </span>
  )
}

export function SlaBadge({ daysRemaining, closed }: { daysRemaining: number | null; closed: boolean }) {
  if (closed) {
    return <span className="inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 font-medium">Closed</span>
  }
  if (daysRemaining === null) {
    return null
  }
  if (daysRemaining < 0) {
    return (
      <span className="inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800 font-medium">
        Overdue {Math.abs(daysRemaining)}d
      </span>
    )
  }
  if (daysRemaining <= DUE_SOON_DAYS) {
    return (
      <span className="inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800 font-medium">
        Due in {daysRemaining}d
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800 font-medium">
      On track
    </span>
  )
}

export function SensitiveBadge() {
  return (
    <span className="inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800 font-medium">
      <LockKeyhole size={11} className="mr-1 text-rose-400" aria-hidden="true" /> Sensitive
    </span>
  )
}

export function OverlapBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800 font-medium">
      <AlertTriangle size={11} className="mr-1 text-amber-400" aria-hidden="true" />
      {count} overlap{count > 1 ? 's' : ''}
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
