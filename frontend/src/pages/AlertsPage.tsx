import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, Loader2, Filter } from 'lucide-react'
import { getAlerts, markAlertRead, markAllAlertsRead } from '../api/alerts'

const KIND_COLORS: Record<string, string> = {
  overlap_high: 'border-l-rose-500 bg-rose-950/20',
  overlap_medium: 'border-l-amber-500 bg-amber-950/20',
  escalation: 'border-l-rose-600 bg-rose-950/20',
  sla_breach: 'border-l-orange-500 bg-orange-950/20',
  sla_risk: 'border-l-amber-400 bg-amber-950/15',
  pending: 'border-l-blue-500 bg-blue-950/20',
  system: 'border-l-slate-600 bg-slate-900/40',
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
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Bell size={20} className="text-blue-500" />
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Operational Alerts
            </h1>
            {unreadCount > 0 && (
              <span className="chip chip-danger font-mono font-bold">
                {unreadCount} UNREAD
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time notifications for SLA risk trajectories, timeline breaches, supervisor escalations, and cross-bureau overlap detections.
          </p>
        </div>

        {/* Action & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5">
            <Filter size={12} className="text-slate-500" />
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer focus:ring-0"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value} className="bg-slate-900 text-slate-200">
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="accent-blue-600 rounded"
            />
            <span>Unread Only</span>
          </label>

          <button
            onClick={() => readAll.mutate()}
            disabled={readAll.isPending || unreadCount === 0}
            className="btn-secondary"
          >
            <CheckCheck size={14} />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Main Alerts List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-xs">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <span>Loading alerts feed...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="panel bg-slate-900/50 p-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded">
          <Bell size={28} className="mx-auto mb-2.5 text-slate-600" />
          <p className="font-medium text-slate-300 mb-0.5">No notifications in view</p>
          <p className="text-slate-500">
            {unreadOnly
              ? 'All alerts in this category have been marked read.'
              : 'There are no active notifications matching your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`panel border-l-4 ${
                KIND_COLORS[a.kind] || 'border-l-slate-600 bg-slate-900/70'
              } ${
                a.read ? 'opacity-60 bg-slate-950/40' : 'bg-slate-900'
              } px-3.5 py-3 rounded flex items-start justify-between gap-3 transition-opacity border-slate-800/80`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    {a.kind.replace('_', ' ')}
                  </span>
                  {a.case_ref && a.case_id ? (
                    <Link
                      to={`/cases/${a.case_id}`}
                      className="font-mono text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      {a.case_ref}
                    </Link>
                  ) : a.case_ref ? (
                    <span className="font-mono text-xs text-blue-400">{a.case_ref}</span>
                  ) : null}
                  {!a.read && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"
                      title="Unread alert"
                    />
                  )}
                  <span className="text-[10px] font-mono text-slate-500 ml-auto">
                    {a.created_at?.replace('T', ' ').slice(0, 16)}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{a.message}</p>
              </div>

              {!a.read && (
                <button
                  onClick={() => readMut.mutate(a.id)}
                  disabled={readMut.isPending}
                  className="text-slate-400 hover:text-emerald-400 transition-colors p-1 rounded hover:bg-slate-800 shrink-0"
                  title="Mark as read"
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
