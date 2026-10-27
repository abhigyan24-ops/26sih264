import { useState } from 'react'
import {
  StatusChip,
  LevelBadge,
  EmptyState,
  ErrorState,
  PageHeader,
  FilterBar,
  DataTable,
  Tabs,
  ConfirmDialog,
} from '../ui'
import { Plus, ShieldCheck } from 'lucide-react'

interface SampleCase {
  id: number
  ref: string
  institution: string
  category: string
  status: string
  daysOpen: number
}

const sampleData: SampleCase[] = [
  {
    id: 1,
    ref: 'AICTE-2026-0841',
    institution: 'Delhi Technological University',
    category: 'Faculty Grievance',
    status: 'escalated',
    daysOpen: 14,
  },
  {
    id: 2,
    ref: 'AICTE-2026-0842',
    institution: 'Netaji Subhas University of Technology',
    category: 'Hostel Infrastructure',
    status: 'under_process',
    daysOpen: 8,
  },
  {
    id: 3,
    ref: 'AICTE-2026-0843',
    institution: 'College of Engineering Pune',
    category: 'Fee Irregularity',
    status: 'action_taken',
    daysOpen: 3,
  },
]

export default function UiGallery() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dangerDialogOpen, setDangerDialogOpen] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [tableEmpty, setTableEmpty] = useState(false)

  const columns = [
    {
      id: 'ref',
      header: 'Case Reference',
      cell: (r: SampleCase) => (
        <span className="font-mono font-medium text-[#1B1F24]">{r.ref}</span>
      ),
    },
    {
      id: 'institution',
      header: 'Institution',
      accessor: (r: SampleCase) => r.institution,
    },
    {
      id: 'category',
      header: 'Category',
      accessor: (r: SampleCase) => r.category,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r: SampleCase) => <StatusChip status={r.status} />,
    },
    {
      id: 'days',
      header: 'Days Open',
      align: 'right' as const,
      cell: (r: SampleCase) => (
        <span className="font-mono tabular-nums">{r.daysOpen}d</span>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F6F5F1] text-[#1B1F24] p-6 lg:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Gallery Header */}
        <PageHeader
          title="Civic Ledger Design System Component Gallery"
          description="Dev-only review environment for the CaseNexus foundational UI primitives."
          breadcrumbs={[
            { label: 'System' },
            { label: 'Component Gallery (/__ui)' },
          ]}
          badge={
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#E8F0FE] text-[#175CD3] text-xs font-mono font-semibold border border-[#B8D5FA]">
              <ShieldCheck className="w-3.5 h-3.5" />
              SPEC V1.0
            </span>
          }
          actions={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1F3A5F] hover:bg-[#17304F] rounded-[4px] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Test Dialog</span>
              </button>
              <button
                type="button"
                onClick={() => setDangerDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#B42318] bg-[#FDECEA] hover:bg-[#F8B7B2] border border-[#F8B7B2] rounded-[4px] transition-colors"
              >
                <span>Test Danger Action</span>
              </button>
            </div>
          }
        />

        {/* Section 1: Typography and Palette Tokens */}
        <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5B6068]">
            01. Design Tokens & Typography
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
            <div className="p-3 rounded-[4px] border border-[#DAD6CC] bg-[#F6F5F1]">
              <span className="font-semibold block">--bg</span>
              <span className="font-mono text-[#5B6068]">#F6F5F1</span>
            </div>
            <div className="p-3 rounded-[4px] border border-[#DAD6CC] bg-[#FFFFFF]">
              <span className="font-semibold block">--surface</span>
              <span className="font-mono text-[#5B6068]">#FFFFFF</span>
            </div>
            <div className="p-3 rounded-[4px] border border-[#DAD6CC] bg-[#EFEDE7]">
              <span className="font-semibold block">--surface-2</span>
              <span className="font-mono text-[#5B6068]">#EFEDE7</span>
            </div>
            <div className="p-3 rounded-[4px] text-white bg-[#1F3A5F]">
              <span className="font-semibold block">--primary</span>
              <span className="font-mono opacity-80">#1F3A5F</span>
            </div>
            <div className="p-3 rounded-[4px] text-white bg-[#14233A]">
              <span className="font-semibold block">--sidebar</span>
              <span className="font-mono opacity-80">#14233A</span>
            </div>
            <div className="p-3 rounded-[4px] text-white bg-[#8A4B08]">
              <span className="font-semibold block">--accent</span>
              <span className="font-mono opacity-80">#8A4B08</span>
            </div>
          </div>
          <div className="pt-2 text-xs text-[#5B6068] space-y-1">
            <p>UI Face: <strong className="text-[#1B1F24] font-sans">IBM Plex Sans (400, 500, 600)</strong></p>
            <p>Reference Face: <strong className="text-[#1B1F24] font-mono">IBM Plex Mono (400, 500, 600) — Case Ref: AICTE-2026-9901</strong></p>
          </div>
        </section>

        {/* Section 2: Status Chips & Level Badges */}
        <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5B6068]">
            02. Status Chips (Icon + Word + Color)
          </h2>
          <div className="flex flex-wrap gap-2.5">
            <StatusChip status="received" />
            <StatusChip status="registered" />
            <StatusChip status="assigned" />
            <StatusChip status="under_process" />
            <StatusChip status="escalated" />
            <StatusChip status="action_taken" />
            <StatusChip status="disposed" />
            <StatusChip status="transferred" />
            <StatusChip status="reopened" />
          </div>

          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5B6068] pt-4">
            03. Overlap Level Badges (With Probability)
          </h2>
          <div className="flex flex-wrap gap-2.5 items-center">
            <LevelBadge level="high" probability={0.94} />
            <LevelBadge level="medium" probability={0.68} />
            <LevelBadge level="info" probability={0.35} />
            <LevelBadge level="high" showIcon={false} />
          </div>
        </section>

        {/* Section 3: Navigation Tabs */}
        <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5B6068]">
            04. Accessible Tabs Navigation
          </h2>
          <Tabs
            tabs={[
              { id: 'all', label: 'All Cases', count: 142 },
              { id: 'active', label: 'Active Investigation', count: 38 },
              { id: 'overlaps', label: 'Cross-Bureau Overlaps', count: 12 },
              { id: 'resolved', label: 'Disposed', count: 92 },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />
          <p className="text-xs text-[#5B6068]">
            Active tab: <strong className="text-[#1B1F24] font-mono">{activeTab}</strong>
          </p>
        </section>

        {/* Section 4: FilterBar & DataTable */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5B6068]">
              05. FilterBar and Ledger DataTable
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTableLoading(!tableLoading)}
                className="px-2.5 py-1 text-xs font-medium border border-[#DAD6CC] rounded-[4px] bg-[#FFFFFF] hover:bg-[#EFEDE7] text-[#1B1F24]"
              >
                {tableLoading ? 'Stop Loading' : 'Simulate Skeleton'}
              </button>
              <button
                type="button"
                onClick={() => setTableEmpty(!tableEmpty)}
                className="px-2.5 py-1 text-xs font-medium border border-[#DAD6CC] rounded-[4px] bg-[#FFFFFF] hover:bg-[#EFEDE7] text-[#1B1F24]"
              >
                {tableEmpty ? 'Show Data' : 'Simulate Empty'}
              </button>
            </div>
          </div>

          <FilterBar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Filter case reference or college..."
            activeFilters={
              searchValue
                ? [
                    {
                      id: 'search',
                      label: 'Query',
                      value: searchValue,
                      onRemove: () => setSearchValue(''),
                    },
                  ]
                : []
            }
            onResetAll={() => setSearchValue('')}
          >
            <select className="px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px]">
              <option value="">All Bureaus</option>
              <option value="AICTE-HQ">AICTE HQ</option>
              <option value="RO-DELHI">RO Delhi</option>
            </select>
          </FilterBar>

          <DataTable
            data={tableEmpty ? [] : sampleData}
            columns={columns}
            keyExtractor={(r) => r.id}
            isLoading={tableLoading}
            skeletonRows={3}
            emptyTitle="No Cases Match Active Query"
            emptyDescription="Try resetting your bureau or search filters to see all assigned grievances."
          />
        </section>

        {/* Section 5: Claymorphism Illustrations (Empty & Error States) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5B6068]">
              06. Clay Empty State Illustration
            </h2>
            <EmptyState
              title="No Overlap Links Found"
              description="Automated text similarity scan completed without detecting cross-bureau duplicates for this institution."
              action={{
                label: 'Run Deep Overlap Scan',
                onClick: () => alert('Scan requested'),
              }}
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5B6068]">
              07. Designed Error State
            </h2>
            <ErrorState
              title="Bureau Egress Service Unavailable"
              message="The data sync adapter encountered a network timeout communicating with the regional grievance repository."
              onRetry={() => alert('Retry triggered')}
            />
          </div>
        </section>

        {/* Interactive Modals */}
        <ConfirmDialog
          isOpen={dialogOpen}
          title="Nominate Lead Bureau"
          description="Are you sure you want to designate AICTE Headquarters as the single coordinated lead for this grievance cluster? Other overlapping cases will be placed on institutional hold."
          confirmLabel="Nominate Lead"
          variant="primary"
          onConfirm={() => {
            alert('Confirmed lead nomination')
            setDialogOpen(false)
          }}
          onCancel={() => setDialogOpen(false)}
        />

        <ConfirmDialog
          isOpen={dangerDialogOpen}
          title="Dismiss Overlap Link"
          description="This action marks the similarity link as false positive. Both grievances will continue in independent parallel processing."
          confirmLabel="Dismiss Link"
          variant="danger"
          onConfirm={() => {
            alert('Dismissed link')
            setDangerDialogOpen(false)
          }}
          onCancel={() => setDangerDialogOpen(false)}
        />
      </div>
    </div>
  )
}
