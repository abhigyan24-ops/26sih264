import { useState, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Lock,
} from 'lucide-react'
import { me } from '../lib/api'
import {
  useCases,
  useFilterMeta,
  formatDate,
} from '../lib/format'
import type { CaseSummary } from '../lib/types'
import RegisterCaseDialog from '../components/RegisterCaseDialog'
import {
  PageHeader,
  FilterBar,
  DataTable,
  StatusChip,
  LevelBadge,
  SlaDue,
  ErrorState,
  type Column,
} from '../ui'

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

  const updateParam = (key: string, value: string | boolean | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null || value === '' || value === false) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
        next.set('page', '1')
        return next
      },
      { replace: true }
    )
  }

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
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

  // Active filter tags for the FilterBar
  const activeFilters = [
    q ? { id: 'q', label: 'Keyword', value: q, onRemove: () => updateParam('q', null) } : null,
    institution
      ? { id: 'inst', label: 'College', value: institution, onRemove: () => updateParam('institution', null) }
      : null,
    aicte_id
      ? { id: 'aicte', label: 'AICTE ID', value: aicte_id, onRemove: () => updateParam('aicte_id', null) }
      : null,
    bureau ? { id: 'bur', label: 'Bureau', value: bureau, onRemove: () => updateParam('bureau', null) } : null,
    region && !isRegional
      ? { id: 'reg', label: 'Region', value: region, onRemove: () => updateParam('region', null) }
      : null,
    category
      ? { id: 'cat', label: 'Category', value: category, onRemove: () => updateParam('category', null) }
      : null,
    status ? { id: 'st', label: 'Status', value: status, onRemove: () => updateParam('status', null) } : null,
    overdue ? { id: 'od', label: 'Breached SLA', value: 'Yes', onRemove: () => updateParam('overdue', false) } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; value: string; onRemove: () => void }>

  // Column definitions for the Civic Ledger DataTable
  const columns: Column<CaseSummary>[] = [
    {
      id: 'case_ref',
      header: (
        <button
          type="button"
          onClick={() => handleSort('case_ref')}
          className="inline-flex items-center gap-1 hover:text-[#1F3A5F] focus:outline-none"
        >
          <span>Reference</span>
          {sort === 'case_ref' ? (
            dir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#1F3A5F]" /> : <ArrowDown className="w-3 h-3 text-[#1F3A5F]" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-40" />
          )}
        </button>
      ),
      cell: (c) => (
        <div className="flex items-center gap-1.5 font-mono">
          <Link
            to={`/cases/${c.id}`}
            className="font-semibold text-[#1F3A5F] hover:underline"
            title={`View case details for ${c.case_ref}`}
          >
            {c.case_ref}
          </Link>
          {c.sensitivity_flag && (
            <span title="Sensitive / Protected Case" className="text-[#8A4B08]">
              <Lock className="w-3 h-3" />
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'institution',
      header: (
        <button
          type="button"
          onClick={() => handleSort('institution')}
          className="inline-flex items-center gap-1 hover:text-[#1F3A5F] focus:outline-none"
        >
          <span>Institution</span>
          {sort === 'institution' ? (
            dir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#1F3A5F]" /> : <ArrowDown className="w-3 h-3 text-[#1F3A5F]" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-40" />
          )}
        </button>
      ),
      cell: (c) => (
        <div className="max-w-xs">
          <Link
            to={`/institutions/${c.institution_id}`}
            className="font-medium text-[#1B1F24] hover:text-[#1F3A5F] hover:underline truncate block"
            title={c.institution}
          >
            {c.institution}
          </Link>
          <div className="text-[11px] font-mono text-[#5B6068]">
            {c.aicte_permanent_id || 'ID N/A'}
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      accessor: (c) => <span className="text-[#5B6068]">{c.category}</span>,
    },
    {
      id: 'bureau',
      header: 'Bureau',
      cell: (c) => (
        <span className="font-mono text-xs font-medium text-[#1B1F24] bg-[#EFEDE7] px-1.5 py-0.5 rounded border border-[#DAD6CC]">
          {c.bureau}
        </span>
      ),
    },
    {
      id: 'received_date',
      header: (
        <button
          type="button"
          onClick={() => handleSort('received_date')}
          className="inline-flex items-center gap-1 hover:text-[#1F3A5F] focus:outline-none"
        >
          <span>Received</span>
          {sort === 'received_date' ? (
            dir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#1F3A5F]" /> : <ArrowDown className="w-3 h-3 text-[#1F3A5F]" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-40" />
          )}
        </button>
      ),
      cell: (c) => (
        <span className="font-mono tabular-nums text-[#5B6068]">
          {formatDate(c.received_date)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (c) => <StatusChip status={c.status} />,
    },
    {
      id: 'sla',
      header: 'SLA Status',
      align: 'right',
      cell: (c) => (
        <SlaDue
          isBreached={c.overdue}
        />
      ),
    },
    {
      id: 'overlap',
      header: 'Overlap Alert',
      align: 'center',
      cell: (c) =>
        c.open_high_overlaps > 0 ? (
          <LevelBadge level="high" showIcon={false} />
        ) : (
          <span className="text-[11px] text-[#8C8A82]">—</span>
        ),
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-full">
      {/* Top Page Header */}
      <PageHeader
        title="Grievance Register"
        description="Unified cross-bureau complaint intake ledger with active similarity detection and SLA monitoring."
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#EFEDE7] text-[#1B1F24] border border-[#DAD6CC] text-xs font-mono font-medium tabular-nums">
            {total} Cases Recorded
          </span>
        }
        actions={
          <button
            ref={registerBtnRef}
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1F3A5F] hover:bg-[#17304F] rounded-[4px] shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Case</span>
          </button>
        }
      />

      {/* Filter Bar with inputs */}
      <FilterBar
        searchValue={q}
        onSearchChange={(val) => updateParam('q', val)}
        searchPlaceholder="Search case reference, keyword, description..."
        activeFilters={activeFilters}
        onResetAll={handleResetFilters}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Institution search input */}
          <div className="relative min-w-[160px]">
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5B6068] pointer-events-none" />
            <input
              type="text"
              value={institution}
              onChange={(e) => updateParam('institution', e.target.value)}
              placeholder="Institution name..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] placeholder:text-[#5B6068] focus:outline-none focus:border-[#1F6FEB]"
            />
          </div>

          {/* Bureau filter */}
          <select
            value={bureau}
            onChange={(e) => updateParam('bureau', e.target.value)}
            className="px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] focus:outline-none focus:border-[#1F6FEB]"
          >
            <option value="">All Bureaus</option>
            {meta?.bureaus?.map((b) => (
              <option key={b.code} value={b.code}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => updateParam('category', e.target.value)}
            className="px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] focus:outline-none focus:border-[#1F6FEB]"
          >
            <option value="">All Categories</option>
            {meta?.categories?.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => updateParam('status', e.target.value)}
            className="px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] focus:outline-none focus:border-[#1F6FEB]"
          >
            <option value="">All Statuses</option>
            {meta?.statuses?.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* Overdue checkbox */}
          <label className="flex items-center gap-1.5 text-xs font-medium text-[#1B1F24] cursor-pointer ml-1 select-none">
            <input
              type="checkbox"
              checked={overdue}
              onChange={(e) => updateParam('overdue', e.target.checked)}
              className="rounded border-[#8C8A82] text-[#B42318] focus:ring-[#1F6FEB]"
            />
            <span className={overdue ? 'text-[#B42318] font-semibold' : 'text-[#5B6068]'}>
              Overdue Only
            </span>
          </label>
        </div>
      </FilterBar>

      {/* Main Ledger Table */}
      {isError ? (
        <ErrorState
          title="Failed to Load Cases"
          message={(error as any)?.message ?? 'An error occurred loading the grievance ledger.'}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="space-y-3">
          <DataTable
            data={cases}
            columns={columns}
            keyExtractor={(c) => c.id}
            isLoading={isLoading}
            skeletonRows={8}
            onRowClick={(c) => navigate(`/cases/${c.id}`)}
            emptyTitle="No Grievance Records Found"
            emptyDescription="No cases match the selected filter parameters. Adjust your search or reset filters."
          />

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 text-xs text-[#5B6068]">
            <div className="flex items-center gap-2 font-mono">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="bg-[#FFFFFF] border border-[#DAD6CC] rounded px-1.5 py-0.5 text-xs text-[#1B1F24]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>·</span>
              <span>
                Showing {total > 0 ? offset + 1 : 0}–{Math.min(offset + limit, total)} of{' '}
                <strong className="text-[#1B1F24]">{total}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded border border-[#DAD6CC] bg-[#FFFFFF] hover:bg-[#EFEDE7] text-[#1B1F24] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1 rounded border border-[#DAD6CC] bg-[#FFFFFF] hover:bg-[#EFEDE7] text-[#1B1F24] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Case Modal Dialog */}
      <RegisterCaseDialog
        open={isRegisterOpen}
        onClose={() => {
          setIsRegisterOpen(false)
          refetch()
        }}
        triggerRef={registerBtnRef}
      />
    </div>
  )
}
