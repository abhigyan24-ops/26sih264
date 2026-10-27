import CaseReviewLinks from '../components/overlap/CaseReviewLinks'
import CaseRiskBadge from '../components/sla/CaseRiskBadge'
import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Send,
  CheckCircle2,
  Lock,
  Info,
  CornerDownRight,
} from 'lucide-react'
import { getCase, addCaseAction, apiUpload, downloadDocument } from '../lib/api'
import {
  formatDate,
  formatDateTime,
  useFilterMeta,
} from '../lib/format'
import type { CaseDetailResponse, Action, DocumentRef } from '../lib/types'
import {
  StatusChip,
  SlaDue,
  Timeline,
  ErrorState,
  Skeleton,
} from '../ui'

const ALLOWED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const queryClient = useQueryClient()
  const caseId = Number(id)

  const { data: meta } = useFilterMeta()

  const navState = location.state as {
    institution_review_needed?: boolean
    overlaps_count?: number
  } | null

  // Fetch Case Detail (BD6)
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<CaseDetailResponse>({
    queryKey: ['case', caseId],
    queryFn: () => getCase(caseId),
    enabled: !isNaN(caseId) && caseId > 0,
    retry: false,
  })

  // Action Form State
  const [actionType, setActionType] = useState<string>('remark')
  const [remarks, setRemarks] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const c = data?.case
  const actions: Action[] = data?.actions || []
  const overlaps = data?.overlaps || []
  const activeSiblings = data?.active_siblings || []

  const isDisposed = c?.status === 'disposed'

  const handleActionTypeChange = (type: string) => {
    setActionType(type)
    if (type === 'escalation') {
      setNewStatus('escalated')
    } else if (type === 'closed') {
      setNewStatus('disposed')
    } else if (type === 'reopened') {
      setNewStatus('reopened')
    } else if (type === 'transfer') {
      setNewStatus('transferred')
    } else {
      setNewStatus('')
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      return
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      setFileError(`Disallowed file type (${ext}). Allowed: ${ALLOWED_EXTS.join(', ')}`)
      setSelectedFile(null)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('File size exceeds 10 MB limit.')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const actionMutation = useMutation({
    mutationFn: async () => {
      const res = await addCaseAction(caseId, {
        action_type: actionType,
        remarks: remarks.trim() || undefined,
        transfer_to: actionType === 'transfer' ? transferTo : undefined,
        new_status: newStatus || undefined,
      })

      const actionId = res.action_id

      if (selectedFile && actionId) {
        try {
          await apiUpload(actionId, selectedFile)
        } catch {
          throw new Error('Action saved, but the file did not upload.')
        }
      }

      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      setSuccessMessage('Action recorded successfully.')
      setRemarks('')
      setTransferTo('')
      setNewStatus('')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setFormErrors({})

      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (err: any) => {
      if (err.message?.includes('Action saved, but the file did not upload')) {
        queryClient.invalidateQueries({ queryKey: ['case', caseId] })
        queryClient.invalidateQueries({ queryKey: ['cases'] })
      }
    },
  })

  const handleSubmitAction = (e: FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    setSuccessMessage(null)

    const errs: Record<string, string> = {}
    if (actionType === 'remark' && !remarks.trim()) {
      errs.remarks = 'Remarks are required for plain remarks'
    }
    if (remarks.length > 2000) {
      errs.remarks = 'Remarks cannot exceed 2000 characters'
    }
    if (actionType === 'transfer') {
      if (!transferTo) {
        errs.transfer_to = 'Please select destination Bureau / Cell'
      } else if (transferTo === c?.bureau) {
        errs.transfer_to = 'Cannot transfer to the current Bureau / Cell'
      }
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    actionMutation.mutate()
  }

  const handleDownload = async (doc: DocumentRef) => {
    try {
      await downloadDocument(doc.id, doc.file_name)
    } catch (err: any) {
      alert(`Failed to download ${doc.file_name}: ${err.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !c) {
    const is404 = (error as any)?.response?.status === 404
    return (
      <div className="p-6 max-w-xl mx-auto my-12">
        <ErrorState
          title={is404 ? 'Case Record Not Found' : 'Error Loading Case'}
          message={
            is404
              ? 'This grievance case does not exist or falls outside assigned officer jurisdiction.'
              : (error as any)?.message || 'An unexpected error occurred loading case metadata.'
          }
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

  // Format actions into TimelineEvent items
  const timelineEvents = actions.map((act) => ({
    id: act.id,
    title: act.action_type.replace(/_/g, ' ').toUpperCase(),
    timestamp: formatDateTime(act.created_at),
    officer: act.officer,
    unit: act.bureau,
    remark: act.remarks,
    badge: (
      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#EFEDE7] text-[#5B6068] border border-[#DAD6CC]">
        {act.action_type}
        {act.action_type === 'transfer' && Boolean(act.meta?.transferred_to) && (
          <span> → {String(act.meta.transferred_to)}</span>
        )}
      </span>
    ),
  }))

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Navigation Breadcrumbs / Return Link */}
      <div>
        <Link
          to="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B6068] hover:text-[#1B1F24] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Grievance Register</span>
        </Link>
      </div>

      {/* Review needed banner */}
      {(navState?.institution_review_needed || c.inst_match_conf < 0.8) && (
        <div className="p-3.5 rounded-[6px] bg-[#FFF3E0] border border-[#FCD299] text-[#9A4A00] text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#9A4A00] shrink-0" />
          <span>
            <strong>Institution Match Notice:</strong> Match confidence is{' '}
            {(c.inst_match_conf * 100).toFixed(0)}%. Institution resolution requires officer verification.
          </span>
        </div>
      )}

      {/* Case Header Card */}
      <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-6 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-[#1B1F24] font-mono tracking-tight">
                {c.case_ref}
              </h1>
              <StatusChip status={c.status} />
              <span
                className={`text-xs px-2 py-0.5 rounded-[4px] font-mono font-medium border ${
                  c.priority === 'urgent'
                    ? 'bg-[#FDECEA] text-[#B42318] border-[#F8B7B2]'
                    : c.priority === 'high'
                    ? 'bg-[#FFF3E0] text-[#9A4A00] border-[#FCD299]'
                    : 'bg-[#EFEDE7] text-[#5B6068] border-[#DAD6CC]'
                }`}
              >
                {c.priority.toUpperCase()} PRIORITY
              </span>
              {c.sensitivity_flag && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-[4px] bg-[#FFF3E0] text-[#8A4B08] border border-[#FCD299] font-medium">
                  <Lock className="w-3 h-3" />
                  Sensitive
                </span>
              )}
              {c.hold_parallel && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-[4px] bg-[#FFF3E0] text-[#9A4A00] border border-[#FCD299] font-medium">
                  ⏸ Parallel Action On Hold
                </span>
              )}
            </div>

            <div className="text-base font-semibold text-[#1B1F24] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1F3A5F] shrink-0" />
              <Link
                to={`/institutions/${c.institution_id}`}
                className="hover:text-[#1F3A5F] hover:underline transition-colors"
              >
                {c.institution}
              </Link>
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-xs text-[#5B6068]">Assigned Bureau / Cell</div>
            <div className="text-base font-mono font-bold text-[#1B1F24] mt-0.5">
              {c.bureau}
            </div>
            <div className="text-xs text-[#5B6068]">{c.bureau_name}</div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-3 border-t border-[#DAD6CC] text-xs">
          <div>
            <span className="text-[#5B6068] block">AICTE ID</span>
            <span className="font-mono text-[#1B1F24] font-medium">{c.aicte_permanent_id || '—'}</span>
          </div>
          <div>
            <span className="text-[#5B6068] block">Region</span>
            <span className="text-[#1B1F24] font-medium">{c.region}</span>
          </div>
          <div>
            <span className="text-[#5B6068] block">Category</span>
            <span className="text-[#1B1F24] font-medium">{c.category}</span>
          </div>
          <div>
            <span className="text-[#5B6068] block">Assigned Officer</span>
            <span className="text-[#1B1F24] font-medium">{c.officer || 'Unassigned'}</span>
          </div>
          <div>
            <span className="text-[#5B6068] block">Intake Date</span>
            <span className="font-mono tabular-nums text-[#1B1F24]">{formatDate(c.received_date)}</span>
          </div>
          <div>
            <span className="text-[#5B6068] block">SLA Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <SlaDue
                daysLeft={c.days_remaining}
                isBreached={typeof c.days_remaining === 'number' && c.days_remaining < 0}
              />
              <CaseRiskBadge caseId={c.id} closed={!!c.closed_date} />
            </div>
          </div>
        </div>

        {/* Description Box */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-[#5B6068] uppercase tracking-wider mb-1.5">
            Grievance Description
          </div>
          <div className="p-3.5 rounded-[4px] bg-[#F6F5F1] border border-[#DAD6CC] text-xs text-[#1B1F24] leading-relaxed whitespace-pre-wrap">
            {c.description || 'No description provided.'}
          </div>
        </div>
      </div>

      {/* Pre-action Sibling Banner */}
      {activeSiblings.length > 0 && (
        <div className="p-4 rounded-[6px] bg-[#E8F0FE] border border-[#B8D5FA] text-[#175CD3] text-xs space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-xs">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              {activeSiblings.length} other active complaint case
              {activeSiblings.length > 1 ? 's' : ''} on this institution
            </span>
          </div>
          <p className="text-[#1B1F24]/80">
            Officers should review parallel grievance movements prior to issuing formal notices.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {activeSiblings.map((sib) => (
              <Link
                key={sib.id}
                to={`/cases/${sib.id}`}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#FFFFFF] border border-[#B8D5FA] text-[#1B1F24] hover:border-[#1F3A5F] transition-colors"
              >
                <span className="font-mono font-medium">{sib.case_ref}</span>
                <span className="text-[10px] px-1 rounded bg-[#EFEDE7] font-mono text-[#5B6068]">
                  {sib.bureau}
                </span>
                <span className="text-[#5B6068]">{sib.category}</span>
                <StatusChip status={sib.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Overlaps Links Section */}
      <CaseReviewLinks overlaps={overlaps} />

      {/* Main Grid: Left Timeline & Form | Right Status & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline of movements */}
          <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-3">
              <h2 className="text-xs font-mono font-semibold text-[#1B1F24] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1F3A5F]" />
                Movement & Action Timeline
              </h2>
              <span className="text-xs font-mono text-[#5B6068]">
                {actions.length} action{actions.length === 1 ? '' : 's'} recorded
              </span>
            </div>

            <Timeline events={timelineEvents} />
          </div>

          {/* Add-Action Form (if not disposed) */}
          {!isDisposed ? (
            <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-mono font-semibold text-[#1B1F24] uppercase tracking-wider flex items-center gap-2 border-b border-[#DAD6CC] pb-3">
                <CornerDownRight className="w-4 h-4 text-[#1F3A5F]" />
                Record Case Action / Movement
              </h2>

              {successMessage && (
                <div className="p-3 rounded-[4px] bg-[#E6F4EC] border border-[#A8E2C2] text-[#067647] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{successMessage}</span>
                </div>
              )}

              {actionMutation.isError && (
                <div className="p-3 rounded-[4px] bg-[#FDECEA] border border-[#F8B7B2] text-[#B42318] text-xs">
                  {(actionMutation.error as any)?.message || 'Failed to record action.'}
                </div>
              )}

              <form onSubmit={handleSubmitAction} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-[#1B1F24] mb-1">
                    Action Type *
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => handleActionTypeChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] focus:outline-none focus:border-[#1F6FEB]"
                  >
                    <option value="remark">Add Internal Note / Remark</option>
                    <option value="notice_issued">Issue Official Notice to College</option>
                    <option value="hearing_scheduled">Schedule Formal Hearing</option>
                    <option value="transfer">Transfer to Other Bureau / Cell</option>
                    <option value="escalation">Escalate Grievance</option>
                    <option value="closed">Close / Dispose Case</option>
                    <option value="reopened">Reopen Grievance</option>
                  </select>
                </div>

                {actionType === 'transfer' && (
                  <div>
                    <label className="block font-medium text-[#1B1F24] mb-1">
                      Transfer Destination Bureau *
                    </label>
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] focus:outline-none focus:border-[#1F6FEB]"
                    >
                      <option value="">Select Destination Bureau</option>
                      {meta?.bureaus?.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.code} — {b.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.transfer_to && (
                      <p className="text-[#B42318] text-[11px] mt-1">{formErrors.transfer_to}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block font-medium text-[#1B1F24] mb-1">
                    Officer Remarks & Findings *
                  </label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter formal findings, directives, or observations..."
                    className="w-full px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] placeholder:text-[#5B6068] focus:outline-none focus:border-[#1F6FEB]"
                  />
                  {formErrors.remarks && (
                    <p className="text-[#B42318] text-[11px] mt-1">{formErrors.remarks}</p>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-[#1B1F24] mb-1">
                    Attach Formal Document (PDF, DOCX, PNG up to 10MB)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="w-full text-xs text-[#5B6068] file:mr-3 file:py-1 file:px-2.5 file:rounded-[4px] file:border file:border-[#8C8A82] file:text-xs file:bg-[#EFEDE7] file:text-[#1B1F24] hover:file:bg-[#DAD6CC]"
                  />
                  {fileError && <p className="text-[#B42318] text-[11px] mt-1">{fileError}</p>}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={actionMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1F3A5F] hover:bg-[#17304F] rounded-[4px] shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{actionMutation.isPending ? 'Recording Movement...' : 'Submit Action'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 rounded-[6px] bg-[#E6F4EC] border border-[#A8E2C2] text-[#067647] text-xs">
              This grievance case has been disposed. Reopening requires administrative authorization.
            </div>
          )}
        </div>

        {/* Right Column: Documents */}
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-mono font-semibold text-[#1B1F24] uppercase tracking-wider border-b border-[#DAD6CC] pb-2">
              Attached Case Documents
            </h3>
            {actions.flatMap((a) => a.documents || []).length === 0 ? (
              <p className="text-xs text-[#5B6068] py-2">No documents attached to this case.</p>
            ) : (
              <div className="space-y-2">
                {actions.flatMap((a) => a.documents || []).map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleDownload(doc)}
                    className="w-full flex items-center justify-between p-2 rounded-[4px] bg-[#F6F5F1] hover:bg-[#EFEDE7] border border-[#DAD6CC] text-xs text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-3.5 h-3.5 text-[#1F3A5F] shrink-0" />
                      <span className="font-mono text-[#1B1F24] truncate">{doc.file_name}</span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-[#5B6068] shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
