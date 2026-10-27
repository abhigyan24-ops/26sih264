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
  Activity,
  ShieldAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../lib/api'
import { PageHeader, KpiStrip, ErrorState, Skeleton } from '../ui'

// Categorical palette from Civic Ledger Spec Section 4.2
const CATEGORICAL_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#5B6068', '#8A4B08']
const BUCKET_COLORS = ['#067647', '#2a78d6', '#9A4A00', '#eb6834', '#B42318']

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #DAD6CC',
  borderRadius: '4px',
  color: '#1B1F24',
  fontSize: '11px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
}

const KPI_CONFIG = [
  { key: 'total', label: 'Total Intake', icon: FileText, variant: 'default' as const },
  { key: 'pending', label: 'Pending Initial', icon: Clock, variant: 'warning' as const },
  { key: 'under_process', label: 'Under Process', icon: Activity, variant: 'default' as const },
  { key: 'disposed', label: 'Disposed', icon: CheckCircle, variant: 'success' as const },
  { key: 'transferred', label: 'Transferred', icon: ArrowUpRight, variant: 'default' as const },
  { key: 'escalated', label: 'Escalated', icon: TrendingUp, variant: 'danger' as const },
  { key: 'overdue', label: 'Breached SLA', icon: AlertTriangle, variant: 'danger' as const },
]

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
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 lg:col-span-2 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <ErrorState
          title="Failed to Load Dashboard Data"
          message={(error as any)?.message ?? 'The central telemetry stream could not be loaded.'}
          onRetry={() => refetch()}
        />
        <button
          onClick={() => refetch()}
          className="sr-only"
          id="dashboard-retry-btn"
        >
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

  const kpiItems = KPI_CONFIG.map(({ key, label, icon, variant }) => ({
    id: key,
    label,
    value: kpi[key],
    icon,
    variant,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* High-priority Overlap Coordination Strip */}
      {highOpen > 0 && (
        <div className="bg-[#FDECEA] border border-[#F8B7B2] rounded-[6px] p-3.5 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2.5 font-medium text-[#B42318]">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>
              <strong>{highOpen} high-confidence cross-bureau overlap{highOpen !== 1 ? 's' : ''}</strong> require lead nomination and institutional coordination.
            </span>
          </div>
          <Link
            to="/overlaps"
            className="inline-flex items-center justify-center px-3 py-1 text-xs font-medium text-white bg-[#B42318] hover:bg-[#911C13] rounded-[4px] transition-colors shrink-0"
          >
            Review Overlaps
          </Link>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Grievance Operations Ledger"
        description="Real-time multi-bureau intake telemetry and resolution metrics across AICTE jurisdictions."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[#E6F4EC] text-[#067647] border border-[#A8E2C2] text-xs font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#067647] animate-pulse" />
            LIVE TELEMETRY
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {updatedAt && (
              <span className="text-xs font-mono text-[#5B6068] hidden sm:inline">
                Synced at {updatedAt}
              </span>
            )}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              id="dashboard-refresh-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] hover:bg-[#EFEDE7] rounded-[4px] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isFetching ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        }
      />

      {/* Compact Operational KPI Strip */}
      <KpiStrip items={kpiItems} />

      {/* Primary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bureau Workload Bar Chart */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-[#DAD6CC] pb-3">
            <h2 className="text-xs font-mono font-semibold text-[#1B1F24] uppercase tracking-wider">
              Bureau & Cell Workload Distribution
            </h2>
            <div className="flex items-center gap-3 text-[11px] font-mono text-[#5B6068]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#2a78d6] inline-block" /> Open
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#B42318] inline-block" /> Overdue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#5B6068] inline-block" /> Closed
              </span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBureau} barGap={2} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFEDE7" />
                <XAxis dataKey="bureau" stroke="#5B6068" fontSize={11} tickLine={false} />
                <YAxis stroke="#5B6068" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="open" name="Open" fill="#2a78d6" />
                <Bar dataKey="overdue" name="Overdue" fill="#B42318" />
                <Bar dataKey="closed" name="Closed" fill="#5B6068" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional Jurisdiction Ratio */}
        <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 shadow-xs flex flex-col justify-between">
          <div className="border-b border-[#DAD6CC] pb-3 mb-3">
            <h2 className="text-xs font-mono font-semibold text-[#1B1F24] uppercase tracking-wider">
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
                  innerRadius={32}
                  paddingAngle={2}
                >
                  {byRegion.map((_, i) => (
                    <Cell key={i} fill={CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-[#DAD6CC] text-[11px] font-mono text-[#5B6068]">
            {byRegion.map((r, i) => (
              <div key={r.region} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                  style={{ backgroundColor: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length] }}
                />
                <span className="truncate">{r.region}:</span>
                <strong className="text-[#1B1F24] tabular-nums">{r.open}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Ageing & Overlap Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ageing Breakdown */}
        <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 shadow-xs">
          <h2 className="text-xs font-mono font-semibold text-[#1B1F24] uppercase tracking-wider mb-4 border-b border-[#DAD6CC] pb-3">
            Open Grievance Ageing Breakdown (Days)
          </h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageing} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFEDE7" />
                <XAxis dataKey="bucket" stroke="#5B6068" fontSize={11} tickLine={false} />
                <YAxis stroke="#5B6068" fontSize={11} tickLine={false} />
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

        {/* Overlap Summary Telemetry */}
        <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-mono font-semibold text-[#1B1F24] uppercase tracking-wider mb-4 border-b border-[#DAD6CC] pb-3">
              Overlap Engine Telemetry
            </h2>
            <div className="space-y-2.5 text-xs">
              {[
                {
                  label: 'High Confidence (Review Required)',
                  value: overlaps.high_open,
                  colorClass: 'text-[#B42318] bg-[#FDECEA] border-[#F8B7B2]',
                },
                {
                  label: 'Medium Confidence (Related Issues)',
                  value: overlaps.medium_open,
                  colorClass: 'text-[#9A4A00] bg-[#FFF3E0] border-[#FCD299]',
                },
                {
                  label: 'Confirmed & Lead Designated',
                  value: overlaps.confirmed,
                  colorClass: 'text-[#067647] bg-[#E6F4EC] border-[#A8E2C2]',
                },
                {
                  label: 'Dismissed Non-Duplicates',
                  value: overlaps.dismissed,
                  colorClass: 'text-[#5B6068] bg-[#EFEDE7] border-[#DAD6CC]',
                },
              ].map(({ label, value, colorClass }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-1.5 border-b border-[#EFEDE7]"
                >
                  <span className="text-[#1B1F24] text-xs font-medium">{label}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-[4px] border text-xs font-mono font-bold tabular-nums ${colorClass}`}
                  >
                    {value ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-[#DAD6CC] text-[11px] text-[#5B6068] font-mono">
            Calibrated classifier model PR-AUC: 0.93 · High threshold &ge; 0.73.
          </div>
        </div>
      </div>
    </div>
  )
}
