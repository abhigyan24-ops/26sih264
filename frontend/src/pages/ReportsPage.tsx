import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  Calendar,
  FileSpreadsheet,
  FileText,
  Loader2,
  Table as TableIcon,
  BarChart3,
  Clock,
  TrendingUp,
  Layers,
} from 'lucide-react'
import {
  getBureauReport,
  getAgeingReport,
  getTrendReport,
  getOverlapReport,
  downloadReportFile,
} from '../api/reports'
import type {
  BureauReportRow,
  AgeingReportRow,
  TrendReportRow,
  OverlapReportRow,
} from '../api/reports'
import { PageHeader } from '../ui/PageHeader'
import { Skeleton } from '../ui/Skeleton'
import { ErrorState } from '../ui/ErrorState'

// Civic Ledger Light Tooltip Theme
const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #DAD6CC',
  borderRadius: '4px',
  color: '#1B1F24',
  fontSize: '11px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
}

// Section 4.2 Categorical Palette
const PALETTE = {
  blue: '#2a78d6',   // Slot 1
  orange: '#eb6834', // Slot 2
  aqua: '#1baf7a',   // Slot 3
  yellow: '#eda100', // Slot 4
  critical: '#B42318',
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeFrom, setActiveFrom] = useState<string | undefined>(undefined)
  const [activeTo, setActiveTo] = useState<string | undefined>(undefined)
  const [downloading, setDownloading] = useState<'xlsx' | 'pdf' | null>(null)

  // Chart table view toggles
  const [showTableBureau, setShowTableBureau] = useState(false)
  const [showTableAgeing, setShowTableAgeing] = useState(false)
  const [showTableTrend, setShowTableTrend] = useState(false)
  const [showTableOverlap, setShowTableOverlap] = useState(false)

  const queryParams = {
    date_from: activeFrom || undefined,
    date_to: activeTo || undefined,
  }

  // 1. Bureau Report
  const bureauQ = useQuery<BureauReportRow[]>({
    queryKey: ['report-bureau', activeFrom, activeTo],
    queryFn: () => getBureauReport(queryParams),
  })

  // 2. Ageing Report
  const ageingQ = useQuery<AgeingReportRow[]>({
    queryKey: ['report-ageing', activeFrom, activeTo],
    queryFn: () => getAgeingReport(queryParams),
  })

  // 3. Trend Report
  const trendQ = useQuery<TrendReportRow[]>({
    queryKey: ['report-trend', activeFrom, activeTo],
    queryFn: () => getTrendReport('month', queryParams),
  })

  // 4. Overlap Report
  const overlapQ = useQuery<OverlapReportRow[]>({
    queryKey: ['report-overlap', activeFrom, activeTo],
    queryFn: () => getOverlapReport(queryParams),
  })

  const isLoading = bureauQ.isLoading || ageingQ.isLoading || trendQ.isLoading || overlapQ.isLoading
  const isError = bureauQ.isError || ageingQ.isError || trendQ.isError || overlapQ.isError

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveFrom(dateFrom)
    setActiveTo(dateTo)
  }

  const handleResetFilter = () => {
    setDateFrom('')
    setDateTo('')
    setActiveFrom(undefined)
    setActiveTo(undefined)
  }

  const handleDownload = async (format: 'xlsx' | 'pdf') => {
    try {
      setDownloading(format)
      await downloadReportFile(format, queryParams)
    } catch (err) {
      console.error(`Failed to download ${format} report:`, err)
    } finally {
      setDownloading(null)
    }
  }

  // Aggregate overlaps by level for chart using validated colors
  const overlapLevelData = React.useMemo(() => {
    const raw = overlapQ.data || []
    const map: Record<string, number> = { High: 0, Medium: 0, Info: 0 }
    for (const r of raw) {
      const lvl = r.level?.toLowerCase()
      if (lvl === 'high') map.High += r.n
      else if (lvl === 'medium') map.Medium += r.n
      else map.Info += r.n
    }
    return [
      { level: 'High', n: map.High, fill: PALETTE.critical },
      { level: 'Medium', n: map.Medium, fill: PALETTE.orange },
      { level: 'Info', n: map.Info, fill: PALETTE.blue },
    ]
  }, [overlapQ.data])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Grievance Reports & Analytics"
        description="Aggregated grievance metrics, resolution velocity, ageing cohorts, and cross-bureau overlap analysis."
        badge={
          <span className="text-[11px] font-mono bg-[#FFF3E0] text-[#9A4A00] border border-[#FCD299] px-2 py-0.5 rounded-[4px]">
            Synthetic Prototype Data
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownload('xlsx')}
              disabled={downloading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] bg-[#FFFFFF] text-[#1B1F24] border border-[#DAD6CC] hover:bg-[#EFEDE7] transition-colors disabled:opacity-50"
              title="Export bureau-wise aggregation to Microsoft Excel"
            >
              {downloading === 'xlsx' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#067647]" />
              )}
              <span>Download Excel</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('pdf')}
              disabled={downloading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] bg-[#1F3A5F] text-white hover:bg-[#17304F] transition-colors disabled:opacity-50 shadow-sm"
              title="Export executive PDF report with timestamp and disclaimer"
            >
              {downloading === 'pdf' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-white" />
              )}
              <span>Download PDF</span>
            </button>
          </div>
        }
      />

      {/* Date-Range Filter Controls */}
      <form
        onSubmit={handleApplyFilter}
        className="flex flex-wrap items-center gap-3 bg-[#FFFFFF] p-3.5 rounded-[6px] border border-[#DAD6CC] text-xs"
      >
        <div className="flex items-center gap-1.5 text-[#1B1F24] font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#5B6068]" />
          <span>Date Filter:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-from" className="text-[#5B6068]">From:</label>
          <input
            id="filter-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1 rounded-[4px] bg-[#FFFFFF] border border-[#DAD6CC] text-[#1B1F24] text-xs focus:ring-1 focus:ring-[#1F3A5F] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-to" className="text-[#5B6068]">To:</label>
          <input
            id="filter-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1 rounded-[4px] bg-[#FFFFFF] border border-[#DAD6CC] text-[#1B1F24] text-xs focus:ring-1 focus:ring-[#1F3A5F] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="submit"
            className="px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#1F3A5F] text-white hover:bg-[#17304F] transition-colors shadow-xs"
          >
            Apply Filter
          </button>
          {(activeFrom || activeTo) && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#FFFFFF] border border-[#DAD6CC] text-[#1B1F24] hover:bg-[#EFEDE7] transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full rounded-[6px]" />
          <Skeleton className="h-72 w-full rounded-[6px]" />
          <Skeleton className="h-72 w-full rounded-[6px]" />
          <Skeleton className="h-72 w-full rounded-[6px]" />
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <ErrorState
          title="Failed to load report analytics"
          message="Could not load grievance analytics reports from server. Check network connection and retry."
          onRetry={() => {
            bureauQ.refetch()
            ageingQ.refetch()
            trendQ.refetch()
            overlapQ.refetch()
          }}
        />
      )}

      {/* Main 4-Chart Grid */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Bureau-wise Case Distribution (Stacked) */}
          <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#1F3A5F]" />
                  <h2 className="text-xs font-semibold text-[#1B1F24] uppercase tracking-wider">
                    Bureau-wise Distribution (Open / Disposed / Overdue)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTableBureau(!showTableBureau)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5B6068] hover:text-[#1B1F24] px-2 py-0.5 rounded-[4px] border border-[#DAD6CC] hover:bg-[#F6F5F1] transition-colors"
                >
                  <TableIcon className="w-3 h-3" />
                  <span>{showTableBureau ? 'Hide Table' : 'Show Table'}</span>
                </button>
              </div>

              <div className="h-64 w-full">
                {bureauQ.data && bureauQ.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bureauQ.data}
                      barGap={2}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#DAD6CC" />
                      <XAxis dataKey="bureau" stroke="#5B6068" fontSize={11} />
                      <YAxis stroke="#5B6068" fontSize={11} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="open" stackId="a" fill={PALETTE.blue} name="Open" />
                      <Bar dataKey="disposed" stackId="a" fill={PALETTE.aqua} name="Disposed" />
                      <Bar dataKey="overdue" stackId="a" fill={PALETTE.critical} name="Overdue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-[#5B6068]">
                    No records found for selected period
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Table Underneath */}
            {showTableBureau && (
              <div className="mt-4 pt-3 border-t border-[#DAD6CC] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#5B6068] border-b border-[#DAD6CC] text-[11px] font-semibold uppercase">
                      <th className="pb-2">Bureau</th>
                      <th className="pb-2 text-right">Open</th>
                      <th className="pb-2 text-right">Disposed</th>
                      <th className="pb-2 text-right">Overdue</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DAD6CC] font-mono">
                    {bureauQ.data?.map((row) => (
                      <tr key={row.bureau} className="hover:bg-[#F6F5F1] transition-colors">
                        <td className="py-1.5 font-medium text-[#1B1F24]">{row.bureau}</td>
                        <td className="py-1.5 text-right tabular-nums text-[#2a78d6]">{row.open}</td>
                        <td className="py-1.5 text-right tabular-nums text-[#067647]">{row.disposed}</td>
                        <td className="py-1.5 text-right tabular-nums text-[#B42318]">{row.overdue}</td>
                        <td className="py-1.5 text-right tabular-nums font-semibold text-[#1B1F24]">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Chart 2: Grievance Ageing Cohorts */}
          <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#9A4A00]" />
                  <h2 className="text-xs font-semibold text-[#1B1F24] uppercase tracking-wider">
                    Grievance Ageing Cohorts (Open Cases)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTableAgeing(!showTableAgeing)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5B6068] hover:text-[#1B1F24] px-2 py-0.5 rounded-[4px] border border-[#DAD6CC] hover:bg-[#F6F5F1] transition-colors"
                >
                  <TableIcon className="w-3 h-3" />
                  <span>{showTableAgeing ? 'Hide Table' : 'Show Table'}</span>
                </button>
              </div>

              <div className="h-64 w-full">
                {ageingQ.data && ageingQ.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ageingQ.data}
                      barGap={2}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#DAD6CC" />
                      <XAxis dataKey="bucket" stroke="#5B6068" fontSize={11} />
                      <YAxis stroke="#5B6068" fontSize={11} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar
                        dataKey="n"
                        fill={PALETTE.orange}
                        name="Open Grievances"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-[#5B6068]">
                    No active open cases in dataset
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Table Underneath */}
            {showTableAgeing && (
              <div className="mt-4 pt-3 border-t border-[#DAD6CC] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#5B6068] border-b border-[#DAD6CC] text-[11px] font-semibold uppercase">
                      <th className="pb-2">Ageing Window</th>
                      <th className="pb-2 text-right">Case Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DAD6CC] font-mono">
                    {ageingQ.data?.map((row) => (
                      <tr key={row.bucket} className="hover:bg-[#F6F5F1] transition-colors">
                        <td className="py-1.5 font-medium text-[#1B1F24]">{row.bucket} days</td>
                        <td className="py-1.5 text-right tabular-nums text-[#eb6834] font-semibold">{row.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Chart 3: Monthly Intake vs Disposal Velocity */}
          <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#067647]" />
                  <h2 className="text-xs font-semibold text-[#1B1F24] uppercase tracking-wider">
                    Monthly Intake vs Disposal Velocity
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTableTrend(!showTableTrend)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5B6068] hover:text-[#1B1F24] px-2 py-0.5 rounded-[4px] border border-[#DAD6CC] hover:bg-[#F6F5F1] transition-colors"
                >
                  <TableIcon className="w-3 h-3" />
                  <span>{showTableTrend ? 'Hide Table' : 'Show Table'}</span>
                </button>
              </div>

              <div className="h-64 w-full">
                {trendQ.data && trendQ.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendQ.data}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#DAD6CC" />
                      <XAxis
                        dataKey="period"
                        stroke="#5B6068"
                        fontSize={10}
                        tickFormatter={(v) => v.slice(0, 7)}
                      />
                      <YAxis stroke="#5B6068" fontSize={11} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Line
                        type="monotone"
                        dataKey="received"
                        stroke={PALETTE.blue}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Received"
                      />
                      <Line
                        type="monotone"
                        dataKey="disposed"
                        stroke={PALETTE.aqua}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Disposed"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-[#5B6068]">
                    No trend records available
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Table Underneath */}
            {showTableTrend && (
              <div className="mt-4 pt-3 border-t border-[#DAD6CC] overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#5B6068] border-b border-[#DAD6CC] text-[11px] font-semibold uppercase">
                      <th className="pb-2">Month</th>
                      <th className="pb-2 text-right">Received</th>
                      <th className="pb-2 text-right">Disposed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DAD6CC] font-mono">
                    {trendQ.data?.slice(-6).map((row) => (
                      <tr key={row.period} className="hover:bg-[#F6F5F1] transition-colors">
                        <td className="py-1.5 font-medium text-[#1B1F24]">{row.period.slice(0, 7)}</td>
                        <td className="py-1.5 text-right tabular-nums text-[#2a78d6]">{row.received}</td>
                        <td className="py-1.5 text-right tabular-nums text-[#067647]">{row.disposed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Chart 4: Overlaps by Severity Level */}
          <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#1F3A5F]" />
                  <h2 className="text-xs font-semibold text-[#1B1F24] uppercase tracking-wider">
                    Overlaps by Confidence Severity
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTableOverlap(!showTableOverlap)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5B6068] hover:text-[#1B1F24] px-2 py-0.5 rounded-[4px] border border-[#DAD6CC] hover:bg-[#F6F5F1] transition-colors"
                >
                  <TableIcon className="w-3 h-3" />
                  <span>{showTableOverlap ? 'Hide Table' : 'Show Table'}</span>
                </button>
              </div>

              <div className="h-64 w-full">
                {overlapLevelData && overlapLevelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={overlapLevelData}
                      barGap={2}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#DAD6CC" />
                      <XAxis dataKey="level" stroke="#5B6068" fontSize={11} />
                      <YAxis stroke="#5B6068" fontSize={11} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="n" name="Overlap Links" radius={[2, 2, 0, 0]}>
                        {overlapLevelData.map((entry, index) => (
                          <rect key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-[#5B6068]">
                    No overlap links detected
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Table Underneath */}
            {showTableOverlap && (
              <div className="mt-4 pt-3 border-t border-[#DAD6CC] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#5B6068] border-b border-[#DAD6CC] text-[11px] font-semibold uppercase">
                      <th className="pb-2">Confidence Level</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Pair Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DAD6CC] font-mono">
                    {overlapQ.data?.map((row, idx) => (
                      <tr key={`${row.level}-${row.status}-${idx}`} className="hover:bg-[#F6F5F1] transition-colors">
                        <td className="py-1.5 font-medium uppercase text-[#1B1F24]">{row.level}</td>
                        <td className="py-1.5 text-[#5B6068] capitalize">{row.status}</td>
                        <td className="py-1.5 text-right tabular-nums text-[#1F3A5F] font-semibold">{row.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
