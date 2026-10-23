import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import {
  FileText, Clock, AlertTriangle, CheckCircle,
  ArrowUpRight, TrendingUp, RefreshCw, Loader2, AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../lib/api'

// F10: consistent colour tokens
const CHART_COLORS = ['#3b82f6', '#f59e0b', '#f43f5e', '#10b981', '#8b5cf6', '#06b6d4']
const BUCKET_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#f43f5e']

const TOOLTIP_STYLE = {
  backgroundColor: '#111827',
  border: '1px solid #1e2d4a',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 12,
}

// F10: KPI card with accessible label
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: number | undefined
  sub?: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
}) {
  return (
    <article
      className="kpi-card group"
      aria-label={`${label}: ${value ?? 0}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${iconBg} transition-colors`}>
          <Icon size={18} className={iconColor} aria-hidden="true" />
        </div>
        <ArrowUpRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" aria-hidden="true" />
      </div>
      <div className="text-2xl font-bold tabular-nums">{value ?? '—'}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub != null && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </article>
  )
}

// F3: 7 KPI cards as per spec
const KPI_DEFS = [
  { key: 'total',        label: 'Total received',  icon: FileText,       iconBg: 'bg-blue-500/10',    iconColor: 'text-blue-400' },
  { key: 'pending',      label: 'Pending',          icon: Clock,          iconBg: 'bg-amber-500/10',   iconColor: 'text-amber-400' },
  { key: 'under_process',label: 'Under process',    icon: RefreshCw,      iconBg: 'bg-cyan-500/10',    iconColor: 'text-cyan-400' },
  { key: 'disposed',     label: 'Disposed',         icon: CheckCircle,    iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
  { key: 'transferred',  label: 'Transferred',      icon: ArrowUpRight,   iconBg: 'bg-sky-500/10',     iconColor: 'text-sky-400' },
  { key: 'escalated',    label: 'Escalated',        icon: TrendingUp,     iconBg: 'bg-purple-500/10',  iconColor: 'text-purple-400' },
  { key: 'overdue',      label: 'Beyond timeline',  icon: AlertTriangle,  iconBg: 'bg-rose-500/10',    iconColor: 'text-rose-400' },
] as const

export default function DashboardPage() {
  // F1: dashboard-specific refetchInterval of 5000ms
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,  // F5: for last-updated time
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 5_000,
  })

  // F9: Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 size={28} className="animate-spin text-blue-500" aria-label="Loading dashboard" />
        <p className="text-sm text-slate-500">Loading dashboard…</p>
      </div>
    )
  }

  // F9: Error state with Retry button
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle size={32} className="text-rose-400" />
        <p className="text-sm text-slate-400">
          {(error as any)?.message ?? 'Failed to load dashboard data.'}
        </p>
        <button
          onClick={() => refetch()}
          className="btn-secondary flex items-center gap-2 text-sm"
          id="dashboard-retry-btn"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  const kpi = data?.kpi ?? {}
  const byBureau: any[] = data?.by_bureau ?? []
  const byRegion: any[] = data?.by_region ?? []
  const overlaps = data?.overlaps ?? {}
  const ageing: any[] = data?.ageing ?? []

  // F5: last-updated time
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null

  // F2: amber overlap banner — show only when high_open > 0
  const highOpen: number = overlaps.high_open ?? 0

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* F2: Amber banner – only visible when there are high-priority overlaps */}
      {highOpen > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <AlertTriangle size={16} aria-hidden="true" />
            {highOpen} potential overlapping case{highOpen !== 1 ? 's' : ''} – coordination required
          </div>
          {/* F2: React Router Link to avoid full page reload */}
          <Link
            to="/overlaps"
            className="text-xs text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors shrink-0"
          >
            View overlaps →
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AICTE Complaint Monitoring — Live View
            {/* F5: last updated timestamp */}
            {updatedAt && (
              <span className="ml-2 text-slate-600">· updated {updatedAt}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary flex items-center gap-2 text-sm"
          id="dashboard-refresh-btn"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} aria-hidden="true" />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* F3: 7 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {KPI_DEFS.map(({ key, label, icon, iconBg, iconColor }) => (
          <KpiCard
            key={key}
            label={label}
            value={kpi[key]}
            icon={icon}
            iconBg={iconBg}
            iconColor={iconColor}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bureau workload */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="text-sm font-semibold mb-4 text-slate-300">Bureau / Cell Workload</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byBureau} barGap={4}>
              <XAxis dataKey="bureau" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
              <Bar dataKey="open" name="Open" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overdue" name="Overdue" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="closed" name="Closed" fill="#334155" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* F4: Open cases by region */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4 text-slate-300">Open Cases by Region</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={byRegion}
                dataKey="open"
                nameKey="region"
                cx="50%"
                cy="50%"
                outerRadius={70}
                paddingAngle={3}
                label={(entry: any) =>
                  (entry.percent ?? 0) > 0.05
                    ? `${entry.region ?? entry.name ?? ''} ${((entry.percent ?? 0) * 100).toFixed(0)}%`
                    : ''
                }
                labelLine={false}
              >
                {byRegion.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ageing + Overlap summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ageing */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4 text-slate-300">Open Cases by Age (days)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={ageing}>
              <XAxis dataKey="bucket" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
              <Bar dataKey="n" name="Cases" radius={[4, 4, 0, 0]}>
                {ageing.map((_, i) => (
                  <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Overlap summary */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4 text-slate-300">Overlap Detection Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'High — Coordination Required', value: overlaps.high_open, color: 'bg-rose-500', text: 'text-rose-400' },
              { label: 'Medium — Related Cases', value: overlaps.medium_open, color: 'bg-amber-500', text: 'text-amber-400' },
              { label: 'Confirmed & Linked', value: overlaps.confirmed, color: 'bg-emerald-500', text: 'text-emerald-400' },
              { label: 'Dismissed', value: overlaps.dismissed, color: 'bg-slate-600', text: 'text-slate-400' },
            ].map(({ label, value, color, text }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${color} shrink-0`} aria-hidden="true" />
                <div className="flex-1 text-sm text-slate-400">{label}</div>
                <div className={`font-bold tabular-nums ${text}`}>{value ?? 0}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-600">
              Cross-bureau overlap detection uses calibrated logistic regression
              (PR-AUC 0.93 on synthetic eval data).
              Thresholds: high ≥ 0.73 · medium ≥ 0.65.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
