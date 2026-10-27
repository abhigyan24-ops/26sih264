import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../lib/api'

const CHART_COLORS = ['#2563eb', '#f59e0b', '#f43f5e', '#10b981', '#8b5cf6', '#06b6d4']
const BUCKET_COLORS = ['#10b981', '#2563eb', '#f59e0b', '#f97316', '#f43f5e']

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '4px',
  color: '#f8fafc',
  fontSize: '11px',
}

// Operational compact KPI metric cell
function KpiCell({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | undefined
  sub?: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded p-3 flex flex-col justify-between">
      <div className="flex items-center justify-between text-slate-400 mb-1.5">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
          {label}
        </span>
        <Icon size={14} className={accent} aria-hidden="true" />
      </div>
      <div className="text-xl font-mono font-bold text-slate-100 tabular-nums">
        {value ?? '—'}
      </div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</div>}
    </div>
  )
}

const KPI_DEFS = [
  { key: 'total', label: 'Total Intake', icon: FileText, accent: 'text-blue-400' },
  { key: 'pending', label: 'Pending Initial', icon: Clock, accent: 'text-amber-400' },
  { key: 'under_process', label: 'Under Process', icon: RefreshCw, accent: 'text-sky-400' },
  { key: 'disposed', label: 'Disposed', icon: CheckCircle, accent: 'text-emerald-400' },
  { key: 'transferred', label: 'Transferred', icon: ArrowUpRight, accent: 'text-purple-400' },
  { key: 'escalated', label: 'Escalated', icon: TrendingUp, accent: 'text-rose-400' },
  { key: 'overdue', label: 'Breached SLA', icon: AlertTriangle, accent: 'text-rose-500' },
] as const

export default function DashboardPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 5_000,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 text-xs">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <p>Loading operational dashboard…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-xs">
        <AlertCircle size={28} className="text-rose-400" />
        <p className="text-slate-400">
          {(error as any)?.message ?? 'Failed to load dashboard data.'}
        </p>
        <button
          onClick={() => refetch()}
          className="btn-secondary"
          id="dashboard-retry-btn"
        >
          <RefreshCw size={13} />
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

  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null
  const highOpen: number = overlaps.high_open ?? 0

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* High-priority Overlap Alert Banner */}
      {highOpen > 0 && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-200 rounded px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle size={15} className="text-rose-400" />
            <span>
              {highOpen} high-confidence grievance overlap{highOpen !== 1 ? 's' : ''} detected across bureaus requiring officer coordination.
            </span>
          </div>
          <Link
            to="/overlaps"
            className="btn-primary text-[11px] py-1 px-2.5 shrink-0"
          >
            Review Overlaps
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Grievance Overview
            <span className="text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-normal">
              LIVE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            AICTE Complaint Monitoring & Resolution Dashboard
            {updatedAt && <span className="text-slate-500"> · Synced at {updatedAt}</span>}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary"
          id="dashboard-refresh-btn"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          <span>{isFetching ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>

      {/* Compact Operational KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {KPI_DEFS.map(({ key, label, icon, accent }) => (
          <KpiCell
            key={key}
            label={label}
            value={kpi[key]}
            icon={icon}
            accent={accent}
          />
        ))}
      </div>

      {/* Primary Workload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bureau Workload Bar Chart */}
        <div className="lg:col-span-2 panel bg-slate-900/80 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Bureau & Cell Workload Distribution
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-blue-500 inline-block" /> Open
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" /> Overdue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-slate-600 inline-block" /> Closed
              </span>
            </div>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBureau} barGap={3} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bureau" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="open" name="Open" fill="#2563eb" />
                <Bar dataKey="overdue" name="Overdue" fill="#f43f5e" />
                <Bar dataKey="closed" name="Closed" fill="#475569" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Open Cases by Region Pie Chart */}
        <div className="panel bg-slate-900/80 border border-slate-800 rounded p-4 flex flex-col justify-between">
          <div className="border-b border-slate-800/80 pb-2 mb-2">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Regional Jurisdiction Ratio
            </h2>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byRegion}
                  dataKey="open"
                  nameKey="region"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={30}
                  paddingAngle={2}
                >
                  {byRegion.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
            {byRegion.map((r, i) => (
              <div key={r.region} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="truncate">{r.region}:</span>
                <strong className="text-slate-200">{r.open}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Ageing & Overlap Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Ageing Cohorts */}
        <div className="panel bg-slate-900/80 border border-slate-800 rounded p-4">
          <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 border-b border-slate-800/80 pb-2">
            Open Grievance Ageing Breakdown (Days)
          </h2>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageing} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="n" name="Cases">
                  {ageing.map((_, i) => (
                    <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overlap Summary */}
        <div className="panel bg-slate-900/80 border border-slate-800 rounded p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 border-b border-slate-800/80 pb-2">
              Overlap Engine Telemetry
            </h2>
            <div className="space-y-2 text-xs">
              {[
                { label: 'High Confidence (Review Required)', value: overlaps.high_open, tag: 'chip-danger' },
                { label: 'Medium Confidence (Related Issues)', value: overlaps.medium_open, tag: 'chip-warning' },
                { label: 'Confirmed & Lead Designated', value: overlaps.confirmed, tag: 'chip-success' },
                { label: 'Dismissed Non-Duplicates', value: overlaps.dismissed, tag: 'chip-neutral' },
              ].map(({ label, value, tag }) => (
                <div key={label} className="flex items-center justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300 text-[11px]">{label}</span>
                  <span className={`chip ${tag} font-bold tabular-nums`}>{value ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
            Calibrated classifier model PR-AUC: 0.93 · High threshold $\ge 0.73$.
          </div>
        </div>
      </div>
    </div>
  )
}
