import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listOverlaps, loadOverlap } from '../api/overlaps'
import OverlapCard from '../components/overlap/OverlapCard'
import { Layers, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

export default function OverlapsPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'suggested'
  const focusId = Number(params.get('id')) || 0
  const [level, setLevel] = useState('')
  const [offset, setOffset] = useState(0)
  const [message, setMessage] = useState('')

  const list = useQuery({
    queryKey: ['overlaps', status, level, offset],
    queryFn: () => listOverlaps(status, level, offset),
    enabled: !focusId,
  })

  const focused = useQuery({
    queryKey: ['overlap', focusId],
    queryFn: () => loadOverlap(focusId),
    enabled: focusId > 0,
  })

  const active = focusId ? focused : list
  const items = focusId ? (focused.data ? [focused.data] : []) : list.data?.data ?? []
  const total = list.data?.total ?? 0
  const pageSize = 20
  const currentPage = Math.floor(offset / pageSize) + 1
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            Grievance Overlap Review
          </h1>
          <span className="text-xs font-mono bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
            Stage 7-10 Coordination
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Review potential duplicates and related complaints across bureaus. Link cases to nominate a lead bureau or dismiss non-overlapping filings.
        </p>
      </div>

      {/* Filter and Tab Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded text-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Overlap status">
          {(['suggested', 'confirmed', 'dismissed'] as const).map((val) => {
            const isActive = status === val
            return (
              <button
                key={val}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setParams({ status: val })
                  setOffset(0)
                }}
                className={`px-3 py-1.5 rounded font-mono font-medium capitalize transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-none'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {val}
              </button>
            )
          })}
        </div>

        {/* Severity Filter & Counts */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Confidence Level:</span>
            <select
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value)
                setOffset(0)
                setParams({ status })
              }}
            >
              <option value="">All Levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="info">Info</option>
            </select>
          </div>

          {!focusId && (
            <span className="text-slate-500 font-mono text-[11px] border-l border-slate-800 pl-3">
              Total: <strong className="text-slate-300">{total}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Alert / Notification Banner */}
      {message && (
        <div
          role="status"
          className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded text-xs flex items-center justify-between"
        >
          <span>{message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage('')}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {active.isPending ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span>Loading overlap pairs...</span>
        </div>
      ) : active.isError ? (
        <div
          role="alert"
          className="bg-rose-950/20 border border-rose-900 text-rose-300 p-4 rounded text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Could not load overlap pairs from server.</span>
          </div>
          <button
            className="btn-secondary"
            onClick={() => void active.refetch()}
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="panel bg-slate-900/50 p-10 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded">
          <p className="font-medium text-slate-300 mb-1">No {status} overlaps found</p>
          <p className="text-slate-500">
            {level
              ? `There are no ${level}-confidence overlaps with status '${status}'.`
              : `All current cases are distinct or already coordinated.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((overlap) => (
            <OverlapCard key={overlap.id} overlap={overlap} notify={setMessage} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!focusId && total > pageSize && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <button
            className="btn-secondary"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <span className="font-mono">
            Page {currentPage} of {totalPages} ({total} items)
          </span>
          <button
            className="btn-secondary"
            disabled={offset + pageSize >= total}
            onClick={() => setOffset(offset + pageSize)}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
