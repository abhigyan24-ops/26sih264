import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, Loader2, Filter } from 'lucide-react'
import { getAlerts, markAlertRead, markAllAlertsRead } from '../api/alerts'

const KIND_COLORS: Record<string, string> = {
  overlap_high: 'border-l-rose-500',
  overlap_medium: 'border-l-amber-500',
  escalation: 'border-l-rose-600',
  sla_breach: 'border-l-orange-500',
  sla_risk: 'border-l-amber-400',
  pending: 'border-l-blue-500',
  system: 'border-l-slate-600',
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

  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell size={20} />
            Alerts
            {unreadCount > 0 && (
              <span className="badge-high text-xs px-2 py-0.5 rounded-full">{unreadCount} unread</span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">SLA breach, escalation, and overlap notifications</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <Filter size={12} className="text-slate-500" />
            <select
              value={kindFilter}
              onChange={e => setKindFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer"
            >
              {KINDS.map(k => (
                <option key={k.value} value={k.value} className="bg-slate-900 text-slate-200">
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={e => setUnreadOnly(e.target.checked)}
              className="accent-blue-500"
            />
            Unread only
          </label>
          <button
            onClick={() => readAll.mutate()}
            disabled={readAll.isPending || unreadCount === 0}
            className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
      ) : alerts.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          No alerts found
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(a => (
            <div
              key={a.id}
              className={`glass rounded-xl px-4 py-3.5 border-l-4 ${
                KIND_COLORS[a.kind] || 'border-l-slate-600'
              } ${a.read ? 'opacity-50' : ''} flex items-start gap-3 transition-opacity`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {a.kind.replace('_', ' ')}
                  </span>
                  {a.case_ref && a.case_id ? (
                    <Link
                      to={`/cases/${a.case_id}`}
                      className="font-mono text-xs text-blue-400 hover:underline"
                    >
                      {a.case_ref}
                    </Link>
                  ) : a.case_ref ? (
                    <span className="font-mono text-xs text-blue-400">{a.case_ref}</span>
                  ) : null}
                  {!a.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Unread" />
                  )}
                </div>
                <p className="text-sm text-slate-300">{a.message}</p>
                <div className="text-xs text-slate-600 mt-1 font-mono">{a.created_at?.split('T')[0]}</div>
              </div>
              {!a.read && (
                <button
                  onClick={() => readMut.mutate(a.id)}
                  disabled={readMut.isPending}
                  className="text-slate-600 hover:text-emerald-400 transition-colors shrink-0 mt-0.5 p-1 rounded hover:bg-slate-800/50"
                  title="Mark read"
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
