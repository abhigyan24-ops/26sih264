import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, Filter } from 'lucide-react'
import { getAlerts, markAlertRead, markAllAlertsRead } from '../api/alerts'
import { PageHeader } from '../ui/PageHeader'
import { EmptyState } from '../ui/EmptyState'
import { Skeleton } from '../ui/Skeleton'

const SEVERITY_RULES: Record<string, { border: string; bg: string; text: string }> = {
  overlap_high: { border: 'border-l-[#B42318]', bg: 'bg-[#FDECEA]/30', text: 'text-[#B42318]' },
  escalation: { border: 'border-l-[#B42318]', bg: 'bg-[#FDECEA]/30', text: 'text-[#B42318]' },
  sla_breach: { border: 'border-l-[#B54708]', bg: 'bg-[#FFF3E0]/30', text: 'text-[#B54708]' },
  sla_risk: { border: 'border-l-[#9A4A00]', bg: 'bg-[#FFF3E0]/20', text: 'text-[#9A4A00]' },
  overlap_medium: { border: 'border-l-[#9A4A00]', bg: 'bg-[#FFF3E0]/20', text: 'text-[#9A4A00]' },
  pending: { border: 'border-l-[#175CD3]', bg: 'bg-[#E8F0FE]/30', text: 'text-[#175CD3]' },
  system: { border: 'border-l-[#5B6068]', bg: 'bg-[#F6F5F1]', text: 'text-[#5B6068]' },
}

const KINDS = [
  { value: '', label: 'All types' },
  { value: 'overlap_high', label: 'Overlap High' },
  { value: 'overlap_medium', label: 'Overlap Medium' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'sla_breach', label: 'SLA Breach' },
  { value: 'sla_risk', label: 'SLA Risk' },
  { value: 'pending', label: 'Pending' },
  { value: 'system', label: 'System' },
]

export default function AlertsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [kindFilter, setKindFilter] = useState('')
  const qc = useQueryClient()

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts-all', unreadOnly, kindFilter],
    queryFn: () => getAlerts(unreadOnly, kindFilter || undefined),
    refetchInterval: 15_000,
  })

  const readMut = useMutation({
    mutationFn: (id: number) => markAlertRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['alerts-all'] })
    },
  })

  const readAll = useMutation({
    mutationFn: markAllAlertsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['alerts-all'] })
    },
  })

  const unreadCount = alerts.filter((a) => !a.read).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Operational Alerts"
        description="Real-time notifications for SLA risk trajectories, timeline breaches, supervisor escalations, and cross-bureau overlap detections."
        badge={
          unreadCount > 0 ? (
            <span className="text-[11px] font-mono font-bold bg-[#FDECEA] text-[#B42318] border border-[#F8B7B2] px-2 py-0.5 rounded-[4px]">
              {unreadCount} UNREAD
            </span>
          ) : (
            <span className="text-[11px] font-mono text-[#067647] bg-[#E6F4EC] border border-[#A8E2C2] px-2 py-0.5 rounded-[4px]">
              ALL CAUGHT UP
            </span>
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Kind filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] px-2.5 py-1.5">
              <Filter size={12} className="text-[#5B6068]" />
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="bg-transparent text-[#1B1F24] outline-none text-xs cursor-pointer focus:ring-0"
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unread Only Checkbox */}
            <label className="flex items-center gap-2 text-xs text-[#1B1F24] cursor-pointer bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] px-2.5 py-1.5 select-none hover:bg-[#F6F5F1] transition-colors">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="rounded-[2px] border-[#DAD6CC] text-[#1F3A5F] focus:ring-[#1F3A5F]"
              />
              <span>Unread Only</span>
            </label>

            {/* Mark All Read Button */}
            <button
              type="button"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending || unreadCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] rounded-[4px] disabled:opacity-50 transition-colors"
            >
              <CheckCheck size={14} className="text-[#067647]" />
              <span>Mark All Read</span>
            </button>
          </div>
        }
      />

      {/* Main Alerts List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-[4px]" />
          <Skeleton className="h-16 w-full rounded-[4px]" />
          <Skeleton className="h-16 w-full rounded-[4px]" />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8 text-[#5B6068]" />}
          title="No notifications in view"
          description={
            unreadOnly
              ? 'All alerts in this category have been marked read.'
              : 'There are no active notifications matching your filters.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {alerts.map((a) => {
            const rule = SEVERITY_RULES[a.kind] || {
              border: 'border-l-[#5B6068]',
              bg: 'bg-[#FFFFFF]',
              text: 'text-[#5B6068]',
            }

            return (
              <div
                key={a.id}
                className={`bg-[#FFFFFF] border border-[#DAD6CC] border-l-4 ${rule.border} ${
                  a.read ? 'opacity-70 bg-[#F6F5F1]' : ''
                } px-4 py-3 rounded-[4px] flex items-start justify-between gap-3 transition-opacity shadow-xs`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${rule.text}`}>
                      {a.kind.replace('_', ' ')}
                    </span>
                    {a.case_ref && a.case_id ? (
                      <Link
                        to={`/cases/${a.case_id}`}
                        className="font-mono text-xs font-semibold text-[#2a78d6] hover:underline"
                      >
                        {a.case_ref}
                      </Link>
                    ) : a.case_ref ? (
                      <span className="font-mono text-xs text-[#2a78d6]">{a.case_ref}</span>
                    ) : null}
                    {!a.read && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#1F3A5F] shrink-0"
                        title="Unread alert"
                      />
                    )}
                    <span className="text-[10px] font-mono text-[#5B6068] ml-auto">
                      {a.created_at?.replace('T', ' ').slice(0, 16)}
                    </span>
                  </div>
                  <p className="text-xs text-[#1B1F24] leading-relaxed">{a.message}</p>
                </div>

                {!a.read && (
                  <button
                    type="button"
                    onClick={() => readMut.mutate(a.id)}
                    disabled={readMut.isPending}
                    className="text-[#5B6068] hover:text-[#067647] hover:bg-[#EFEDE7] transition-colors p-1.5 rounded-[4px] shrink-0"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
