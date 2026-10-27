import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  AlertTriangle,
  Layers,
} from 'lucide-react'
import { useInstitution, formatDate } from '../lib/format'
import {
  PageHeader,
  DataTable,
  StatusChip,
  SlaDue,
  KpiStrip,
  ErrorState,
  Skeleton,
  type Column,
} from '../ui'

export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const instId = Number(id)

  const { data, isLoading, isError, error, refetch } = useInstitution(instId)

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !data?.institution) {
    const is404 = (error as any)?.response?.status === 404
    return (
      <div className="p-6 max-w-xl mx-auto my-12">
        <ErrorState
          title={is404 ? 'Institution Not Found' : 'Error Loading Profile'}
          message={
            is404
              ? 'This institution does not exist in the AICTE directory or falls outside assigned jurisdiction.'
              : (error as any)?.message || 'An error occurred loading institution profile data.'
          }
          onRetry={() => refetch()}
        />
        <div className="mt-4 text-center">
          <Link
            to="/cases"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] hover:bg-[#EFEDE7]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Cases Register</span>
          </Link>
        </div>
      </div>
    )
  }

  const {
    institution: inst,
    cases = [],
    repeat_categories = [],
    active_by_bureau = [],
    stats = { total: 0, open: 0, disposed: 0, overdue: 0 },
  } = data

  const multipleBureausActive = active_by_bureau.length >= 2

  const kpiItems = [
    { id: 'total', label: 'Total Intake', value: stats.total, variant: 'default' as const },
    { id: 'open', label: 'Active Investigation', value: stats.open, variant: 'warning' as const },
    { id: 'disposed', label: 'Disposed', value: stats.disposed, variant: 'success' as const },
    { id: 'overdue', label: 'Overdue SLA', value: stats.overdue, variant: 'danger' as const },
  ]

  const caseColumns: Column<any>[] = [
    {
      id: 'case_ref',
      header: 'Case Reference',
      cell: (c) => (
        <span className="font-mono font-semibold text-[#1F3A5F]">
          {c.case_ref}
        </span>
      ),
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
      id: 'category',
      header: 'Category',
      accessor: (c) => <span className="text-[#5B6068]">{c.category}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (c) => <StatusChip status={c.status} />,
    },
    {
      id: 'received_date',
      header: 'Received',
      cell: (c) => (
        <span className="font-mono tabular-nums text-[#5B6068]">
          {formatDate(c.received_date)}
        </span>
      ),
    },
    {
      id: 'closed_date',
      header: 'Closed',
      cell: (c) => (
        <span className="font-mono tabular-nums text-[#5B6068]">
          {c.closed_date ? formatDate(c.closed_date) : '—'}
        </span>
      ),
    },
    {
      id: 'sla',
      header: 'SLA Status',
      align: 'right',
      cell: (c) => (
        <SlaDue
          daysLeft={c.days_remaining}
          isBreached={c.days_remaining !== undefined && c.days_remaining < 0}
        />
      ),
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B6068] hover:text-[#1B1F24] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Grievance Register</span>
        </Link>
      </div>

      {/* Institution Header Card */}
      <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-6 space-y-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-[6px] bg-[#E8F0FE] text-[#1F3A5F] border border-[#B8D5FA] shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1B1F24] tracking-tight">
                {inst.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#5B6068]">
                {inst.aicte_permanent_id && (
                  <span>
                    AICTE Permanent ID:{' '}
                    <strong className="font-mono text-[#1B1F24]">
                      {inst.aicte_permanent_id}
                    </strong>
                  </span>
                )}
                <span>·</span>
                <span>
                  Region: <strong className="text-[#1B1F24]">{inst.region}</strong>
                </span>
                {inst.inst_type && (
                  <>
                    <span>·</span>
                    <span>
                      Type: <strong className="text-[#1B1F24]">{inst.inst_type}</strong>
                    </span>
                  </>
                )}
              </div>
              {(inst.address || inst.city || inst.state) && (
                <div className="text-xs text-[#5B6068] mt-1 font-sans">
                  {[inst.address, inst.city, inst.state].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="pt-2 border-t border-[#DAD6CC]">
          <KpiStrip items={kpiItems} className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-4" />
        </div>
      </div>

      {/* Active Bureaus Banner */}
      <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-3">
          <h2 className="text-xs font-mono font-semibold text-[#1B1F24] uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1F3A5F]" />
            Active Handling Bureaus & Cells
          </h2>
          <span className="text-xs font-mono text-[#5B6068]">
            {active_by_bureau.length} Unit{active_by_bureau.length === 1 ? '' : 's'} Active
          </span>
        </div>

        {active_by_bureau.length === 0 ? (
          <p className="text-xs text-[#5B6068] py-2">No active grievances currently pending across bureaus.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2.5">
              {active_by_bureau.map((b: any) => (
                <div
                  key={b.bureau}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#E8F0FE] border border-[#B8D5FA] text-xs text-[#1B1F24]"
                >
                  <span className="font-mono font-bold text-[#175CD3]">{b.bureau}</span>
                  <span className="text-[#5B6068]">({b.bureau_name}):</span>
                  <span className="font-mono font-bold text-[#1B1F24]">{b.open_cases} open</span>
                </div>
              ))}
            </div>

            {multipleBureausActive && (
              <div className="p-3 rounded-[4px] bg-[#FFF3E0] border border-[#FCD299] text-[#9A4A00] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#9A4A00]" />
                <span>
                  <strong>Multiple bureaus are handling grievances for this institution concurrently.</strong> Coordinated lead bureau nomination is strongly advised.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Repeat Categories */}
        {repeat_categories.length > 0 && (
          <div className="pt-3 border-t border-[#DAD6CC]">
            <div className="text-xs font-mono font-semibold text-[#5B6068] uppercase tracking-wider mb-2">
              Recurrent Complaint Categories
            </div>
            <div className="flex flex-wrap gap-2">
              {repeat_categories.map((rc: any) => (
                <span
                  key={rc.category}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#EFEDE7] border border-[#DAD6CC] text-xs text-[#1B1F24]"
                >
                  <span>{rc.label || rc.category}</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#FFFFFF] text-[11px] font-mono font-semibold text-[#8A4B08] border border-[#DAD6CC]">
                    {rc.n}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cases Table */}
      <div className="space-y-3">
        <PageHeader
          title="Institution Grievance Ledger"
          description="Chronological record of all complaints filed against this institution across all AICTE regional offices and central bureaus."
        />

        <DataTable
          data={cases}
          columns={caseColumns}
          keyExtractor={(c) => c.id}
          onRowClick={(c) => navigate(`/cases/${c.id}`)}
          emptyTitle="No Complaints Filed for this Institution"
          emptyDescription="No grievance records have been lodged under this permanent institution ID."
        />
      </div>
    </div>
  )
}
