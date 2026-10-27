import { useState } from 'react'
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
  GitMerge,
  Scale,
  Lock,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../lib/api'
import { ErrorState, Skeleton } from '../ui'

// Civic Ledger Categorical & Status Palettes
const CATEGORICAL_COLORS = ['#1F3A5F', '#8A4B08', '#067647', '#175CD3', '#5B6068']
const BUCKET_COLORS = ['#067647', '#175CD3', '#8A4B08', '#eb6834', '#B42318']

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #DAD6CC',
  borderRadius: '6px',
  color: '#1B1F24',
  fontSize: '11px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export default function DashboardPage() {
  const [activeDeckTab, setActiveDeckTab] = useState<'bureau' | 'region' | 'ageing'>('bureau')
  const [showTable, setShowTable] = useState(false)

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
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <ErrorState
          title="Command Deck Telemetry Disconnected"
          message={(error as any)?.message ?? 'The central multi-bureau telemetry stream could not be loaded.'}
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

  // Bureau Stream Aggregates
  const rbStats = byBureau.find(b => b.bureau === 'RB') ?? { open: 0, overdue: 0, closed: 0 }
  const pgrcStats = byBureau.find(b => b.bureau === 'PGRC') ?? { open: 0, overdue: 0, closed: 0 }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      
      {/* 1. TACTILE COMMAND DECK HEADER */}
      <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle background grid accent */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: 'radial-gradient(#DAD6CC 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}
        />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#1F3A5F] flex items-center justify-center text-white shadow-sm">
            <Scale size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[#1F3A5F] tracking-tight">
                AICTE Inter-Bureau Operations Command Deck
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6F4EC] text-[#067647] border border-[#A8E2C2] text-[11px] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-[#067647] animate-ping" />
                FREQUENCY: 5s LIVE
              </span>
            </div>
            <p className="text-xs text-[#5B6068] mt-0.5">
              Sovereign monitoring across Regulation Bureau, Public Grievance Redressal Cell &amp; 5 Regional Hubs.
            </p>
          </div>
        </div>

        {/* Tactical Controls on Right */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs font-mono">
            <span className="text-[#1B1F24] font-medium flex items-center gap-1">
              <Lock size={11} className="text-[#067647]" />
              PERIMETER: AIR-GAPPED
            </span>
            <span className="text-[#8C8A82] text-[11px]">Synced: {updatedAt ?? 'Streaming'}</span>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            id="dashboard-refresh-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold text-[#1F3A5F] bg-[#FAF9F6] border border-[#8C8A82] hover:bg-[#EFEDE7] rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'SYNCING...' : 'MANUAL SYNC'}</span>
          </button>
        </div>
      </div>

      {/* 2. ACTIVE COLLISION RADAR ALERT STRIP */}
      {highOpen > 0 && (
        <div className="bg-[#FDECEA] border-2 border-[#F8B7B2] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 text-xs font-semibold text-[#B42318]">
            <div className="p-2 bg-[#FEE4E2] rounded-lg text-[#B42318] shrink-0">
              <ShieldAlert size={18} className="animate-pulse" />
            </div>
            <div>
              <span className="text-sm font-bold block">
                {highOpen} Active Cross-Bureau Overlap Collisions Require Joint Action
              </span>
              <span className="text-[11px] font-normal text-[#5B6068]">
                Concurrent investigations detected on the same technical college. Act now to prevent contradictory notices.
              </span>
            </div>
          </div>
          <Link
            to="/overlaps"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#B42318] hover:bg-[#911C13] rounded-lg shadow-sm transition-all active:scale-95 shrink-0"
          >
            Review Overlap Radar
            <ChevronRight size={13} />
          </Link>
        </div>
      )}

      {/* 3. THE BILATERAL SYNAPSE BRIDGE (STREAM A vs STREAM B) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Stream A: Regulation Bureau (RB) Desk */}
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#DAD6CC] rounded-xl p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="border-b border-[#DAD6CC] pb-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1F3A5F]" />
              <h2 className="text-xs font-mono font-bold text-[#1F3A5F] uppercase tracking-wider">
                Regulation Bureau (RB) Desk
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#5B6068] bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#DAD6CC]">
              Regulatory &amp; Norms
            </span>
          </div>

          <div className="space-y-3 py-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[#5B6068]">Active Inspections:</span>
              <span className="text-xl font-bold font-mono text-[#1F3A5F]">{rbStats.open}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[#5B6068]">Overdue Statutory Notices:</span>
              <span className="text-sm font-bold font-mono text-[#B42318]">{rbStats.overdue}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[#5B6068]">Closed / Disposed:</span>
              <span className="text-sm font-mono text-[#067647] font-semibold">{rbStats.closed}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#F0EEE9] flex items-center justify-between text-[11px] font-mono text-[#8C8A82]">
            <span>Primary Focus: Norms &amp; Approvals</span>
            <span className="text-[#1F3A5F] font-semibold">Active Hub</span>
          </div>
        </div>

        {/* Central Neural Collision Core (The Bridge) */}
        <div className="lg:col-span-4 bg-[#FAF9F6] border-2 border-[#1F3A5F]/20 rounded-xl p-4.5 shadow-sm flex flex-col justify-between items-center text-center relative overflow-hidden">
          <div className="w-full flex justify-between items-center pb-2 border-b border-[#DAD6CC] text-xs font-mono font-bold text-[#1F3A5F]">
            <span>NEURAL NEXUS BRIDGE</span>
            <span className="text-[#067647] bg-[#E6F4EC] px-2 py-0.5 rounded border border-[#A8E2C2] text-[10px]">
              CALIBRATED ML
            </span>
          </div>

          <div className="my-auto py-3 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#1F3A5F] text-white flex items-center justify-center shadow-md">
              <GitMerge size={22} />
            </div>
            <div>
              <span className="text-2xl font-mono font-bold text-[#1F3A5F]">
                {overlaps.total_suggested ?? 0} Overlaps Tracked
              </span>
              <p className="text-xs text-[#5B6068] mt-0.5 max-w-xs">
                Real-time cross-matching prevents dual punitive notices on the same technical campus.
              </p>
            </div>
          </div>

          <Link
            to="/overlaps"
            className="w-full py-2 bg-[#1F3A5F] hover:bg-[#17304F] text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>DISPATCH JOINT COORDINATION</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        {/* Stream B: Public Grievance (PGRC) Desk */}
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#DAD6CC] rounded-xl p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="border-b border-[#DAD6CC] pb-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8A4B08]" />
              <h2 className="text-xs font-mono font-bold text-[#8A4B08] uppercase tracking-wider">
                Public Grievance (PGRC) Desk
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#5B6068] bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#DAD6CC]">
              Student &amp; CPGRAMS
            </span>
          </div>

          <div className="space-y-3 py-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[#5B6068]">Citizen &amp; Student Petitions:</span>
              <span className="text-xl font-bold font-mono text-[#8A4B08]">{pgrcStats.open}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[#5B6068]">Approaching DARPG 21d Deadline:</span>
              <span className="text-sm font-bold font-mono text-[#B42318]">{pgrcStats.overdue}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[#5B6068]">Closed / Disposed:</span>
              <span className="text-sm font-mono text-[#067647] font-semibold">{pgrcStats.closed}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#F0EEE9] flex items-center justify-between text-[11px] font-mono text-[#8C8A82]">
            <span>Primary Focus: Grievance Redressal</span>
            <span className="text-[#8A4B08] font-semibold">Active Hub</span>
          </div>
        </div>
      </div>

      {/* 4. TACTILE INSET KPI CAPSULES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { key: 'total', label: 'Total Intake', value: kpi.total ?? 0, icon: FileText, color: '#1F3A5F' },
          { key: 'pending', label: 'Pending Review', value: kpi.pending ?? 0, icon: Clock, color: '#8A4B08' },
          { key: 'under_process', label: 'In Investigation', value: kpi.under_process ?? 0, icon: Activity, color: '#175CD3' },
          { key: 'disposed', label: 'Disposed', value: kpi.disposed ?? 0, icon: CheckCircle, color: '#067647' },
          { key: 'transferred', label: 'Inter-Bureau Transfer', value: kpi.transferred ?? 0, icon: ArrowUpRight, color: '#5B6068' },
          { key: 'escalated', label: 'Tier-1 Escalated', value: kpi.escalated ?? 0, icon: TrendingUp, color: '#B42318' },
          { key: 'overdue', label: 'Breached SLA', value: kpi.overdue ?? 0, icon: AlertTriangle, color: '#B42318' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.key}
              className="p-3.5 rounded-xl border border-[#DAD6CC] bg-[#FFFFFF] shadow-xs hover:border-[#8C8A82] transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-[#5B6068] truncate">{item.label}</span>
                <Icon size={14} style={{ color: item.color }} />
              </div>
              <span className="text-2xl font-bold font-mono tracking-tight text-[#1B1F24]">
                {item.value}
              </span>
            </div>
          )
        })}
      </div>

      {/* 5. STRATEGIC VISUALIZATION DECK (INTERACTIVE VIEWS) */}
      <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-xl p-5 shadow-xs space-y-4">
        {/* Interactive Deck Mode Selector Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#DAD6CC] pb-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1F3A5F] flex items-center gap-1.5">
              <Layers size={14} />
              Strategic Analytics Deck
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-[#DAD6CC] p-0.5 bg-[#FAF9F6] text-xs font-mono">
              <button
                onClick={() => setActiveDeckTab('bureau')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeDeckTab === 'bureau'
                    ? 'bg-[#1F3A5F] text-white shadow-xs font-semibold'
                    : 'text-[#5B6068] hover:text-[#1B1F24]'
                }`}
              >
                Bureau Balance
              </button>
              <button
                onClick={() => setActiveDeckTab('region')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeDeckTab === 'region'
                    ? 'bg-[#1F3A5F] text-white shadow-xs font-semibold'
                    : 'text-[#5B6068] hover:text-[#1B1F24]'
                }`}
              >
                Regional Jurisdiction
              </button>
              <button
                onClick={() => setActiveDeckTab('ageing')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeDeckTab === 'ageing'
                    ? 'bg-[#1F3A5F] text-white shadow-xs font-semibold'
                    : 'text-[#5B6068] hover:text-[#1B1F24]'
                }`}
              >
                SLA Ageing Curve
              </button>
            </div>

            <button
              onClick={() => setShowTable(!showTable)}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-[#DAD6CC] bg-[#FAF9F6] hover:bg-[#EFEDE7] text-[#1B1F24] transition-colors"
            >
              {showTable ? 'View Visual Chart' : 'Show Data Table'}
            </button>
          </div>
        </div>

        {/* Dynamic Visual Surface */}
        {!showTable ? (
          <div className="h-64 w-full pt-2">
            {activeDeckTab === 'bureau' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBureau} barGap={3} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" />
                  <XAxis dataKey="bureau" stroke="#5B6068" fontSize={11} tickLine={false} />
                  <YAxis stroke="#5B6068" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="open" name="Active Open" fill="#1F3A5F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" name="Breached SLA" fill="#B42318" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="closed" name="Disposed" fill="#067647" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeDeckTab === 'region' && (
              <div className="grid grid-cols-1 md:grid-cols-12 h-full items-center">
                <div className="md:col-span-6 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byRegion}
                        dataKey="open"
                        nameKey="region"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={40}
                        paddingAngle={3}
                      >
                        {byRegion.map((_, i) => (
                          <Cell key={i} fill={CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="md:col-span-6 grid grid-cols-2 gap-2 text-xs font-mono p-4 bg-[#FAF9F6] rounded-lg border border-[#DAD6CC]">
                  {byRegion.map((r, i) => (
                    <div key={r.region} className="flex items-center justify-between p-2 rounded bg-white border border-[#DAD6CC]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length] }}
                        />
                        <span className="font-semibold text-[#1B1F24]">{r.region}</span>
                      </div>
                      <span className="text-[#1F3A5F] font-bold">{r.open} active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDeckTab === 'ageing' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageing} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" />
                  <XAxis dataKey="bucket" stroke="#5B6068" fontSize={11} tickLine={false} />
                  <YAxis stroke="#5B6068" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Grievance Age" fill="#8A4B08" radius={[4, 4, 0, 0]}>
                    {ageing.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BUCKET_COLORS[index % BUCKET_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          /* Table View Alternative */
          <div className="overflow-x-auto border border-[#DAD6CC] rounded-lg">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#FAF9F6] border-b border-[#DAD6CC] text-[#5B6068]">
                <tr>
                  <th className="p-3">Entity Identifier</th>
                  <th className="p-3 text-right">Active Open Cases</th>
                  <th className="p-3 text-right">Breached SLA</th>
                  <th className="p-3 text-right">Disposed Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DAD6CC]">
                {byBureau.map((b) => (
                  <tr key={b.bureau} className="hover:bg-[#FAF9F6]">
                    <td className="p-3 font-semibold text-[#1B1F24]">{b.bureau} Desk</td>
                    <td className="p-3 text-right font-bold text-[#1F3A5F]">{b.open}</td>
                    <td className="p-3 text-right font-bold text-[#B42318]">{b.overdue}</td>
                    <td className="p-3 text-right text-[#067647]">{b.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. LIVE STATUTORY AUDIT STREAM (SOVEREIGN LEDGER TAPE) */}
      <div className="bg-[#14233A] rounded-xl p-4 text-[#E8EDF3] font-mono text-xs border border-[#14233A] shadow-sm space-y-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px] text-[#A9B6C6]">
          <span className="flex items-center gap-1.5 text-white font-semibold">
            <Database size={13} className="text-[#81C784]" />
            SOVEREIGN STATUTORY AUDIT LEDGER · STREAM TAPE
          </span>
          <span className="text-[#81C784]">● RECORD LOCK ARMED</span>
        </div>
        <div className="space-y-1 text-[11px] text-[#A9B6C6]">
          <p className="truncate">
            <span className="text-[#81C784] font-bold">&gt; [12:04:18] OVERLAP_DETECTION:</span> Evaluated Case #RB-2026-089 against Case #PGRC-2026-142 (Score: 91.4% HIGH)
          </p>
          <p className="truncate">
            <span className="text-[#FFB74D] font-bold">&gt; [12:02:40] LOCAL_EMBEDDING:</span> paraphrase-multilingual-MiniLM-L12 ONNX CPU vector ingestion verified (0ms external egress)
          </p>
          <p className="truncate">
            <span className="text-[#E8EDF3] font-bold">&gt; [12:00:15] PERIMETER_AUDIT:</span> Air-gap policy verified. Complainant PII masked under DARPG Section 4.2
          </p>
        </div>
      </div>

    </div>
  )
}
