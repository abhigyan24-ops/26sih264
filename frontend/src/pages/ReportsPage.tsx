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
  AlertCircle,
  RefreshCw,
  Info,
  Clock,
  Layers,
  TrendingUp,
  BarChart3,
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

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '12px',
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeFrom, setActiveFrom] = useState<string | undefined>(undefined)
  const [activeTo, setActiveTo] = useState<string | undefined>(undefined)
  const [downloading, setDownloading] = useState<'xlsx' | 'pdf' | null>(null)

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

  // Aggregate overlaps by level for chart
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
      { level: 'High', n: map.High, fill: '#f43f5e' },
      { level: 'Medium', n: map.Medium, fill: '#f59e0b' },
      { level: 'Info', n: map.Info, fill: '#3b82f6' },
    ]
  }, [overlapQ.data])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Grievance Reports & Analytics
            </h1>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30"
              title="All figures and summaries reflect synthetic prototype data"
            >
              <Info className="w-3.5 h-3.5" />
              Synthetic prototype data
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated grievance metrics, resolution velocity, ageing cohorts, and cross-bureau overlap analysis.
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleDownload('xlsx')}
            disabled={downloading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
            title="Export bureau-wise aggregation to Microsoft Excel"
          >
            {downloading === 'xlsx' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            )}
            Download Excel
          </button>
          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition-colors disabled:opacity-50"
            title="Export executive PDF report with timestamp and disclaimer"
          >
            {downloading === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-rose-400" />
            )}
            Download PDF
          </button>
        </div>
      </div>

      {/* Date-Range Filter Controls */}
      <form
        onSubmit={handleApplyFilter}
        className="flex flex-wrap items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-sm"
      >
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Date Filter:</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Apply Filter
          </button>
          {(activeFrom || activeTo) && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-400">Loading grievance reports and analytics...</p>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-rose-950/20 border border-rose-900/50 rounded-xl">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <p className="text-sm text-slate-300">Failed to load report data from server.</p>
          <button
            onClick={() => {
              bureauQ.refetch()
              ageingQ.refetch()
              trendQ.refetch()
              overlapQ.refetch()
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Main 4-Chart Grid */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Bureau-wise Case Distribution (Stacked) */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                  Bureau-wise Distribution (Open / Disposed / Overdue)
                </h2>
              </div>
              <div className="h-64 w-full">
                {bureauQ.data && bureauQ.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bureauQ.data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="bureau" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="open" stackId="a" fill="#3b82f6" name="Open" />
                      <Bar dataKey="disposed" stackId="a" fill="#10b981" name="Disposed" />
                      <Bar dataKey="overdue" stackId="a" fill="#f43f5e" name="Overdue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500">
                    No records found for selected period
                  </div>
                )}
              </div>
            </div>

            {/* Table Underneath */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-2 font-medium">Bureau</th>
                    <th className="pb-2 font-medium text-right">Open</th>
                    <th className="pb-2 font-medium text-right">Disposed</th>
                    <th className="pb-2 font-medium text-right">Overdue</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {bureauQ.data?.map((row) => (
                    <tr key={row.bureau} className="hover:bg-slate-800/30">
                      <td className="py-1.5 font-medium">{row.bureau}</td>
                      <td className="py-1.5 text-right tabular-nums text-blue-400">{row.open}</td>
                      <td className="py-1.5 text-right tabular-nums text-emerald-400">{row.disposed}</td>
                      <td className="py-1.5 text-right tabular-nums text-rose-400">{row.overdue}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Chart 2: Grievance Ageing Cohorts */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                  Grievance Ageing Cohorts (Open Cases)
                </h2>
              </div>
              <div className="h-64 w-full">
                {ageingQ.data && ageingQ.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageingQ.data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="n" fill="#f59e0b" name="Open Grievances" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500">
                    No active open cases in dataset
                  </div>
                )}
              </div>
            </div>

            {/* Table Underneath */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-2 font-medium">Ageing Window</th>
                    <th className="pb-2 font-medium text-right">Case Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {ageingQ.data?.map((row) => (
                    <tr key={row.bucket} className="hover:bg-slate-800/30">
                      <td className="py-1.5 font-medium">{row.bucket} days</td>
                      <td className="py-1.5 text-right tabular-nums text-amber-400 font-semibold">{row.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Chart 3: Monthly Intake vs Disposal Velocity */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                  Monthly Intake vs Disposal Velocity
                </h2>
              </div>
              <div className="h-64 w-full">
                {trendQ.data && trendQ.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendQ.data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="period"
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={(v) => v.slice(0, 7)}
                      />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Line
                        type="monotone"
                        dataKey="received"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Received"
                      />
                      <Line
                        type="monotone"
                        dataKey="disposed"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Disposed"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500">
                    No trend records available
                  </div>
                )}
              </div>
            </div>

            {/* Table Underneath */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto max-h-48">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-2 font-medium">Month</th>
                    <th className="pb-2 font-medium text-right">Received</th>
                    <th className="pb-2 font-medium text-right">Disposed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {trendQ.data?.slice(-6).map((row) => (
                    <tr key={row.period} className="hover:bg-slate-800/30">
                      <td className="py-1.5 font-medium">{row.period.slice(0, 7)}</td>
                      <td className="py-1.5 text-right tabular-nums text-blue-400">{row.received}</td>
                      <td className="py-1.5 text-right tabular-nums text-emerald-400">{row.disposed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Chart 4: Overlaps by Severity Level */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                  Overlaps by Confidence Severity
                </h2>
              </div>
              <div className="h-64 w-full">
                {overlapLevelData && overlapLevelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overlapLevelData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="level" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="n" name="Overlap Links" radius={[4, 4, 0, 0]}>
                        {overlapLevelData.map((entry, index) => (
                          <rect key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500">
                    No overlap links detected
                  </div>
                )}
              </div>
            </div>

            {/* Table Underneath */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-2 font-medium">Confidence Level</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Pair Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {overlapQ.data?.map((row, idx) => (
                    <tr key={`${row.level}-${row.status}-${idx}`} className="hover:bg-slate-800/30">
                      <td className="py-1.5 font-medium uppercase text-slate-200">{row.level}</td>
                      <td className="py-1.5 text-slate-400 capitalize">{row.status}</td>
                      <td className="py-1.5 text-right tabular-nums text-purple-400 font-semibold">{row.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
