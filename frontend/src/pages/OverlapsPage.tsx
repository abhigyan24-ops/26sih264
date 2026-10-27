import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listOverlaps, loadOverlap } from '../api/overlaps'
import OverlapCard from '../components/overlap/OverlapCard'
import { PageHeader } from '../ui/PageHeader'
import { Tabs } from '../ui/Tabs'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { Skeleton } from '../ui/Skeleton'
import { Layers, ChevronLeft, ChevronRight, CheckCircle2, X } from 'lucide-react'

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

  const tabs = [
    { id: 'suggested', label: 'Suggested' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'dismissed', label: 'Dismissed' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Grievance Overlap Review"
        description="Review potential duplicates and related complaints across bureaus. Link cases to nominate a lead bureau or dismiss non-overlapping filings."
        badge={
          <span className="text-[11px] font-mono bg-[#EFEDE7] text-[#5B6068] border border-[#DAD6CC] px-2 py-0.5 rounded-[4px]">
            Stage 7-10 Coordination
          </span>
        }
      />

      {/* Filter and Tab Controls */}
      <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <Tabs
            tabs={tabs}
            activeId={status}
            onChange={(val) => {
              setParams({ status: val })
              setOffset(0)
            }}
          />

          {/* Severity Filter & Total Count */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <label htmlFor="confidence-filter" className="text-xs text-[#5B6068] font-medium">
                Confidence:
              </label>
              <select
                id="confidence-filter"
                className="bg-[#FFFFFF] border border-[#DAD6CC] text-[#1B1F24] rounded-[4px] px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]"
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
              <span className="text-xs font-mono text-[#5B6068] border-l border-[#DAD6CC] pl-3">
                Total: <strong className="text-[#1B1F24]">{total}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Alert / Notification Banner */}
      {message && (
        <div
          role="status"
          className="bg-[#E6F4EC] border border-[#A8E2C2] text-[#067647] px-4 py-2.5 rounded-[4px] text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#067647]" />
            <span className="font-medium">{message}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setMessage('')}
            className="text-[#067647] hover:text-[#054E2E] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {active.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-[6px]" />
          <Skeleton className="h-44 w-full rounded-[6px]" />
        </div>
      ) : active.isError ? (
        <ErrorState
          title="Could not load overlap pairs"
          message="Failed to load overlap pairs from the server. Please check the network connection and retry."
          onRetry={() => void active.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8 text-[#5B6068]" />}
          title={`No ${status} overlaps found`}
          description={
            level
              ? `There are no ${level}-confidence overlaps with status '${status}'.`
              : `All current cases are distinct or already coordinated.`
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map((overlap) => (
            <OverlapCard key={overlap.id} overlap={overlap} notify={setMessage} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!focusId && total > pageSize && (
        <div className="flex items-center justify-between text-xs text-[#5B6068] pt-2 border-t border-[#DAD6CC]">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] rounded-[4px] disabled:opacity-50 disabled:pointer-events-none transition-colors"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <span className="font-mono text-[11px]">
            Page {currentPage} of {totalPages} ({total} items)
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] rounded-[4px] disabled:opacity-50 disabled:pointer-events-none transition-colors"
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
