import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  FileText, Clock, AlertTriangle, CheckCircle,
  ArrowUpRight, Link2, Shield, TrendingUp, RefreshCw, Loader2
} from 'lucide-react'
import { getDashboard } from '../lib/api'

const KPI_COLORS = ['#3b82f6','#f59e0b','#f43f5e','#10b981','#8b5cf6','#06b6d4']
const BUCKET_COLORS = ['#10b981','#3b82f6','#f59e0b','#f97316','#f43f5e']

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="kpi-card group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}/10 group-hover:${color}/20 transition-colors`}>
          <Icon size={18} className={color.replace('bg-', 'text-')} />
        </div>
        <ArrowUpRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
      <div className="text-2xl font-bold tabular-nums">{value ?? '—'}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub != null && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  )
}

const TOOLTIP_STYLE = {
  backgroundColor: '#111827',
  border: '1px solid #1e2d4a',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 12,
}

export default function DashboardPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={28} className="animate-spin text-blue-500" />
    </div>
  )

  const kpi = data?.kpi || {}
  const byBureau: any[] = data?.by_bureau || []
  const byRegion: any[] = data?.by_region || []
  const overlaps = data?.overlaps || {}
  const ageing: any[] = data?.ageing || []

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">AICTE Complaint Monitoring — Live View</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Cases" value={kpi.total} icon={FileText} color="bg-blue-500" />
        <KpiCard label="Pending / In-Progress" value={(kpi.pending ?? 0) + (kpi.under_process ?? 0)} icon={Clock} color="bg-amber-500" sub={`${kpi.pending} pending · ${kpi.under_process} in-process`} />
        <KpiCard label="Overdue" value={kpi.overdue} icon={AlertTriangle} color="bg-rose-500" />
        <KpiCard label="Disposed" value={kpi.disposed} icon={CheckCircle} color="bg-emerald-500" />
        <KpiCard label="Escalated" value={kpi.escalated} icon={TrendingUp} color="bg-purple-500" />
        <KpiCard label="Transferred" value={kpi.transferred} icon={ArrowUpRight} color="bg-cyan-500" />
        <KpiCard label="High Overlaps" value={overlaps.high_open} icon={Link2} color="bg-rose-500" sub={`${overlaps.medium_open} medium · ${overlaps.confirmed} confirmed`} />
        <KpiCard label="On Hold (Coord.)" value={kpi.on_hold} icon={Shield} color="bg-slate-500" />
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
              <Bar dataKey="open" name="Open" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="overdue" name="Overdue" fill="#f43f5e" radius={[4,4,0,0]} />
              <Bar dataKey="closed" name="Closed" fill="#334155" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Region */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4 text-slate-300">Open Cases by Region</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={byRegion}
                dataKey="open"
                nameKey="region"
                cx="50%" cy="50%"
                outerRadius={70}
                paddingAngle={3}
                label={({ region, percent }) =>
                  percent > 0.05 ? `${region} ${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {byRegion.map((_, i) => (
                  <Cell key={i} fill={KPI_COLORS[i % KPI_COLORS.length]} />
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
              <Bar dataKey="n" name="Cases" radius={[4,4,0,0]}>
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
                <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
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
