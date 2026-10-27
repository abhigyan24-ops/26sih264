// src/pages/CasesPage.tsx — FD4
import { useState, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Filter,
  RotateCcw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { me } from '../lib/api'
import {
  useCases,
  useFilterMeta,
  formatDate,
  StatusBadge,
  SlaBadge,
  SensitiveBadge,
  OverlapBadge,
} from '../lib/format'
import type { CaseSummary } from '../lib/types'
import RegisterCaseDialog from '../components/RegisterCaseDialog'

export default function CasesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const registerBtnRef = useRef<HTMLButtonElement>(null)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  // Current user for regional role check
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    staleTime: Infinity,
  })
  const isRegional = user?.role === 'regional'

  // Filter options from meta endpoint (BD3)
  const { data: meta } = useFilterMeta()

  // Read URL query params
  const q = searchParams.get('q') || ''
  const institution = searchParams.get('institution') || ''
  const aicte_id = searchParams.get('aicte_id') || ''
  const bureau = searchParams.get('bureau') || ''
  const region = searchParams.get('region') || ''
  const category = searchParams.get('category') || ''
  const status = searchParams.get('status') || ''
  const date_from = searchParams.get('date_from') || ''
  const date_to = searchParams.get('date_to') || ''
  const overdue = searchParams.get('overdue') === 'true'

  const sort = searchParams.get('sort') || 'received_date'
  const dir = (searchParams.get('dir') || 'desc') as 'asc' | 'desc'
  const page = parseInt(searchParams.get('page') || '1', 10) || 1
  const limit = parseInt(searchParams.get('limit') || '25', 10) || 25
  const offset = (page - 1) * limit

  // Backend query params
  const queryParams: Record<string, string | number | boolean | undefined> = {
    limit,
    offset,
    sort,
    dir,
  }
  if (q.trim()) queryParams.q = q.trim()
  if (institution.trim()) queryParams.institution = institution.trim()
  if (aicte_id.trim()) queryParams.aicte_id = aicte_id.trim()
  if (bureau) queryParams.bureau = bureau
  if (region && !isRegional) queryParams.region = region
  if (category) queryParams.category = category
  if (status) queryParams.status = status
  if (date_from) queryParams.date_from = date_from
  if (date_to) queryParams.date_to = date_to
  if (overdue) queryParams.overdue = true

  // Fetch cases with X-Total-Count
  const { data, isLoading, isError, error, refetch } = useCases(queryParams)
  const cases: CaseSummary[] = (data?.data as CaseSummary[]) || []
  const total = data?.total ?? 0

  const totalPages = Math.max(1, Math.ceil(total / limit))

  // Helper to update search params and reset page to 1
  const updateParam = (key: string, value: string | boolean | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null || value === '' || value === false) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
        next.set('page', '1') // changing filter resets to page 1
        return next
      },
      { replace: true }
    )
  }

  const handleSort = (colKey: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (sort === colKey) {
          next.set('dir', dir === 'asc' ? 'desc' : 'asc')
        } else {
          next.set('sort', colKey)
          next.set('dir', 'asc')
        }
        return next
      },
      { replace: true }
    )
  }

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('page', String(newPage))
        return next
      },
      { replace: true }
    )
  }

  const handleLimitChange = (newLimit: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('limit', String(newLimit))
        next.set('page', '1')
        return next
      },
      { replace: true }
    )
  }

  // Active filter count (excluding pagination/sort)
  const activeFilterCount = [
    q,
    institution,
    aicte_id,
    bureau,
    !isRegional ? region : null,
    category,
    status,
    date_from,
    date_to,
    overdue ? 'overdue' : null,
  ].filter(Boolean).length

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Complaint Cases
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Cross-bureau grievance and complaint register with unified tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            ref={registerBtnRef}
            onClick={() => setIsRegisterOpen(true)}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus size={16} />
            Register Case
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel bg-slate-900 border border-slate-800 rounded p-4 space-y-3.5 border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Filter size={14} className="text-blue-400" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} />
              Reset all
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          {/* Search q */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={q}
              onChange={(e) => updateParam('q', e.target.value)}
              placeholder="Search case ID, description..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Institution Name */}
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={institution}
              onChange={(e) => updateParam('institution', e.target.value)}
              placeholder="Institution name..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* AICTE ID */}
          <div>
            <input
              type="text"
              value={aicte_id}
              onChange={(e) => updateParam('aicte_id', e.target.value)}
              placeholder="AICTE ID (e.g. 1-1234567)"
              className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Bureau */}
          <div>
            <select
              value={bureau}
              onChange={(e) => updateParam('bureau', e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Bureaus / Cells</option>
              {meta?.bureaus?.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Region (Hidden if user is regional) */}
          {isRegional ? (
            <div className="flex items-center px-3 py-2 rounded bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
              Region:&nbsp;<span className="text-white font-medium">{user?.region}</span>
              <span className="ml-auto text-[10px] text-slate-500">(Fixed scope)</span>
            </div>
          ) : (
            <div>
              <select
                value={region}
                onChange={(e) => updateParam('region', e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Regions</option>
                {meta?.regions?.map((r) => (
                  <option key={r} value={r}>
                    {r} Region
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          <div>
            <select
              value={category}
              onChange={(e) => updateParam('category', e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {meta?.categories?.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {meta?.statuses?.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From & To */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={date_from}
                onChange={(e) => updateParam('date_from', e.target.value)}
                aria-label="Date from"
                className="w-full bg-slate-900/80 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-slate-500 text-xs">to</span>
            <div className="relative flex-1">
              <input
                type="date"
                value={date_to}
                onChange={(e) => updateParam('date_to', e.target.value)}
                aria-label="Date to"
                className="w-full bg-slate-900/80 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Overdue toggle */}
        <div className="pt-1 flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overdue}
              onChange={(e) => updateParam('overdue', e.target.checked)}
              className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-900"
            />
            <span className={overdue ? 'text-rose-400 font-medium' : 'text-slate-400'}>
              Show Overdue cases only
            </span>
          </label>

          <span className="text-slate-500">
            {isLoading ? 'Updating...' : `Found ${total} matching case${total === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {/* Table Section */}
      <div className="panel bg-slate-900 border border-slate-800 rounded border border-slate-800 overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-center gap-3 text-slate-400 text-sm py-8">
              <Loader2 size={20} className="animate-spin text-blue-500" />
              <span>Loading complaint cases...</span>
            </div>
          </div>
        ) : isError ? (
          <div className="p-10 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-base font-semibold text-white">Error loading cases</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {(error as any)?.message || 'Failed to fetch case list from server.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-slate-800/60 text-slate-400">
              <Search size={24} />
            </div>
            <h3 className="text-base font-semibold text-white">No cases match these filters</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try relaxing your search terms, changing the bureau filter, or clearing the date range.
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-medium transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase font-medium tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4">
                    <button
                      onClick={() => handleSort('case_ref')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      aria-sort={
                        sort === 'case_ref'
                          ? dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      Case Ref
                      {sort === 'case_ref' ? (
                        dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4">
                    <button
                      onClick={() => handleSort('institution')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      aria-sort={
                        sort === 'institution'
                          ? dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      Institution
                      {sort === 'institution' ? (
                        dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3">
                    <button
                      onClick={() => handleSort('bureau')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      aria-sort={
                        sort === 'bureau'
                          ? dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      Bureau
                      {sort === 'bureau' ? (
                        dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3">
                    <button
                      onClick={() => handleSort('category')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      aria-sort={
                        sort === 'category'
                          ? dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      Category
                      {sort === 'category' ? (
                        dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      aria-sort={
                        sort === 'status'
                          ? dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      Status
                      {sort === 'status' ? (
                        dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3">
                    <button
                      onClick={() => handleSort('received_date')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      aria-sort={
                        sort === 'received_date'
                          ? dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      Received
                      {sort === 'received_date' ? (
                        dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3">
                    <button
                      onClick={() => handleSort('sla_due_date')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      aria-sort={
                        sort === 'sla_due_date'
                          ? dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      SLA Due
                      {sort === 'sla_due_date' ? (
                        dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3">
                    Officer
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    Flags
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cases.map((c) => {
                  return (
                    <tr
                      key={c.id}
                      tabIndex={0}
                      onClick={() => navigate(`/cases/${c.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/cases/${c.id}`)
                      }}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group focus:outline-none focus:bg-slate-800/60"
                    >
                      {/* Case Ref link */}
                      <td className="py-3 px-4 font-mono font-medium text-blue-400 group-hover:text-blue-300">
                        <Link
                          to={`/cases/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline focus:underline"
                        >
                          {c.case_ref}
                        </Link>
                      </td>

                      {/* Institution & AICTE ID */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-white truncate" title={c.institution}>
                          {c.institution}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {c.aicte_permanent_id || '—'}
                          {c.region && ` • ${c.region}`}
                        </div>
                      </td>

                      {/* Bureau */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700/60">
                          {c.bureau}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-slate-300 font-medium">
                        {c.category}
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-3">
                        <StatusBadge status={c.status} />
                      </td>

                      {/* Received Date */}
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {formatDate(c.received_date)}
                      </td>

                      {/* SLA Due */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <SlaBadge
                            daysRemaining={
                              c.closed_date
                                ? null
                                : Math.round(
                                    (new Date(c.sla_due_date).getTime() - new Date().setHours(0,0,0,0)) /
                                      (1000 * 60 * 60 * 24)
                                  )
                            }
                            closed={!!c.closed_date}
                          />
                          <span className="text-[10px] text-slate-500">
                            {formatDate(c.sla_due_date)}
                          </span>
                        </div>
                      </td>

                      {/* Officer */}
                      <td className="py-3 px-3 text-slate-300 truncate max-w-[120px]">
                        {c.officer || '—'}
                      </td>

                      {/* Flags (Sensitive & Overlaps) */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {c.sensitivity_flag && <SensitiveBadge />}
                          {c.open_high_overlaps > 0 && (
                            <OverlapBadge count={c.open_high_overlaps} />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && total > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>
                Showing <span className="font-medium text-white">{offset + 1}</span> to{' '}
                <span className="font-medium text-white">{Math.min(offset + limit, total)}</span> of{' '}
                <span className="font-medium text-white">{total}</span> cases
              </span>

              <span className="text-slate-600">|</span>

              <label className="flex items-center gap-1.5 text-slate-400">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 flex items-center gap-1 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <span className="px-2 text-slate-300">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 flex items-center gap-1 transition-colors"
                aria-label="Next page"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Register Case Modal */}
      <RegisterCaseDialog
        open={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        triggerRef={registerBtnRef}
      />
    </div>
  )
}
