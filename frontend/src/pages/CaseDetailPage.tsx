import CaseReviewLinks from '../components/overlap/CaseReviewLinks'
// src/pages/CaseDetailPage.tsx — FD5 to FD8
import { useState, useRef } from 'react'
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
  Loader2,
  CheckCircle2,
  ArrowRight,
  AlertOctagon,
  CornerDownRight,
  Info,
} from 'lucide-react'
import { getCase, addCaseAction, apiUpload, downloadDocument } from '../lib/api'
import {
  formatDate,
  formatDateTime,
  StatusBadge,
  SlaBadge,
  SensitiveBadge,
  useFilterMeta,
} from '../lib/format'
import type { CaseDetailResponse, Action, DocumentRef } from '../lib/types'

const ALLOWED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const queryClient = useQueryClient()
  const caseId = Number(id)

  const { data: meta } = useFilterMeta()

  // Location state (e.g. from RegisterCaseDialog)
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

  // Action Form State (FD8)
  const [actionType, setActionType] = useState<string>('remark')
  const [remarks, setRemarks] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [uploadFailureActionId, setUploadFailureActionId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const c = data?.case
  const actions: Action[] = data?.actions || []
  const overlaps = data?.overlaps || []
  const activeSiblings = data?.active_siblings || []

  const isDisposed = c?.status === 'disposed'

  // Update suggestions when action type changes
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

  // File validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: async () => {
      // 1. Submit action
      const res = await addCaseAction(caseId, {
        action_type: actionType,
        remarks: remarks.trim() || undefined,
        transfer_to: actionType === 'transfer' ? transferTo : undefined,
        new_status: newStatus || undefined,
      })

      const actionId = res.action_id

      // 2. Upload file if selected
      if (selectedFile && actionId) {
        try {
          await apiUpload(actionId, selectedFile)
        } catch {
          setUploadFailureActionId(actionId)
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
      setUploadFailureActionId(null)
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

  // Retry upload mutation if only file failed
  const retryUploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFailureActionId || !selectedFile) return
      await apiUpload(uploadFailureActionId, selectedFile)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      setSuccessMessage('File uploaded successfully.')
      setSelectedFile(null)
      setUploadFailureActionId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => setSuccessMessage(null), 5000)
    },
  })

  const handleSubmitAction = (e: React.FormEvent) => {
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

  // Handle document download
  const handleDownload = async (doc: DocumentRef) => {
    try {
      await downloadDocument(doc.id, doc.file_name)
    } catch (err: any) {
      alert(`Failed to download ${doc.file_name}: ${err.message}`)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm text-slate-400">Loading case details...</p>
      </div>
    )
  }

  // 404 or Out-of-Scope error state (FD5 requirement)
  if (isError || !c) {
    const is404 = (error as any)?.response?.status === 404
    return (
      <div className="p-6 max-w-2xl mx-auto my-12 text-center space-y-4 glass rounded-2xl border border-slate-800">
        <div className="inline-flex p-3 rounded-full bg-slate-800/80 text-slate-400">
          <AlertOctagon size={32} />
        </div>
        <h2 className="text-xl font-bold text-white">
          {is404 ? 'Case Not Found' : 'Error Loading Case'}
        </h2>
        <p className="text-sm text-slate-400">
          {is404
            ? 'This case does not exist or falls outside your regional jurisdiction.'
            : (error as any)?.message || 'An unexpected error occurred.'}
        </p>
        <div className="pt-2">
          <Link
            to="/cases"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Cases
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/cases"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Cases
        </Link>
      </div>

      {/* Review needed banner (FD10) */}
      {(navState?.institution_review_needed || c.inst_match_conf < 0.8) && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <span>
            <strong>Institution Match Notice:</strong> Match confidence is{' '}
            {(c.inst_match_conf * 100).toFixed(0)}%. Institution match needs officer confirmation.
          </span>
        </div>
      )}

      {/* FD5: Header Card */}
      <div className="glass rounded-2xl p-6 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-white font-mono tracking-tight">
                {c.case_ref}
              </h1>
              <StatusBadge status={c.status} />
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.priority === 'urgent'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : c.priority === 'high'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-700/40 text-slate-300 border border-slate-600/30'
                }`}
              >
                {c.priority} priority
              </span>
              {c.sensitivity_flag && <SensitiveBadge />}
              {c.hold_parallel && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40 font-medium flex items-center gap-1">
                  ⏸ Hold parallel action
                </span>
              )}
            </div>

            <div className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Building2 size={18} className="text-blue-400 shrink-0" />
              <Link
                to={`/institutions/${c.institution_id}`}
                className="hover:text-blue-400 hover:underline transition-colors"
              >
                {c.institution}
              </Link>
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-xs text-slate-400">Current Bureau / Cell</div>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {c.bureau}
            </div>
            <div className="text-xs text-slate-400">{c.bureau_name}</div>
          </div>
        </div>

        {/* Key Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block">AICTE ID</span>
            <span className="font-mono text-slate-200">{c.aicte_permanent_id || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Region</span>
            <span className="text-slate-200">{c.region}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Category</span>
            <span className="text-slate-200 font-medium">{c.category}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Assigned Officer</span>
            <span className="text-slate-200">{c.officer || 'Unassigned'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Received Date</span>
            <span className="text-slate-200">{formatDate(c.received_date)}</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">SLA Due Date</span>
              {c.sla_source === 'ILLUSTRATIVE' && (
                <span className="text-[10px] text-slate-500 italic" title="Seed SLA rule">
                  (Illustrative)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <SlaBadge daysRemaining={c.days_remaining} closed={!!c.closed_date} />
              <span className="text-slate-300">{formatDate(c.sla_due_date)}</span>
            </div>
          </div>
        </div>

        {/* Description Card */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Complaint Description
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {c.description || 'No description provided.'}
          </div>
        </div>
      </div>

      {/* FD6: Pre-action Banner */}
      {activeSiblings.length > 0 && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-sm text-blue-300">
            <Info size={16} className="text-blue-400 shrink-0" />
            <span>
              {activeSiblings.length} other active complaint case
              {activeSiblings.length > 1 ? 's' : ''} on this institution
            </span>
          </div>

          <p className="text-blue-300/80">
            Officers are advised to review parallel cases before issuing notices or taking decisions.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {activeSiblings.map((sib) => (
              <Link
                key={sib.id}
                to={`/cases/${sib.id}`}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-900/50 hover:bg-blue-800/60 border border-blue-700/50 text-blue-200 transition-colors"
              >
                <span className="font-mono font-medium text-white">{sib.case_ref}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 font-mono text-blue-300">
                  {sib.bureau}
                </span>
                <span className="text-slate-400">{sib.category}</span>
                <StatusBadge status={sib.status} />
              </Link>
            ))}
          </div>

          {c.hold_parallel && (
            <div className="p-2.5 mt-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0 text-amber-400" />
              <span>
                Parallel action is currently <strong>on hold</strong> pending inter-bureau coordination.
              </span>
            </div>
          )}
        </div>
      )}

      {/* F-D3: Under pre-action banner, Possible overlaps (n) chips */}
      {overlaps.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-slate-300">
              <AlertTriangle size={15} className="text-amber-400 shrink-0" />
              <span>Possible overlaps ({overlaps.length})</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Stage 6 Overlap Engine</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-0.5">
            {overlaps.map((o) => (
              <Link
                key={o.id}
                to={`/cases/${o.other_case_id}`}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                  o.level === 'high'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/50'
                    : o.level === 'medium'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/50'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="font-semibold text-white">
                  {o.other_case_ref || `Case #${o.other_case_id}`}
                </span>
                <span
                  className={`text-[10px] uppercase font-sans font-bold px-1.5 py-0.5 rounded ${
                    o.level === 'high'
                      ? 'bg-rose-500/20 text-rose-300'
                      : o.level === 'medium'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {o.level}
                </span>
                <span className="text-[11px] text-slate-400 font-sans">
                  {Math.round(o.probability * 100)}%
                </span>
                <ArrowRight size={11} className="text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <CaseReviewLinks overlaps={overlaps} />

      {/* Main Grid: Left Timeline + Action Form | Right Overlaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* FD7: Timeline */}
          <div className="glass rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock size={16} className="text-blue-400" />
                Case History & Movement Timeline
              </h2>
              <span className="text-xs text-slate-500">
                {actions.length} action{actions.length === 1 ? '' : 's'} recorded
              </span>
            </div>

            {actions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No actions recorded yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-800">
                {actions.map((act) => {
                  const typeClean = act.action_type.replace(/_/g, ' ')
                  const isTransfer = act.action_type === 'transfer'
                  const isEscalation = act.action_type === 'escalation'
                  const isClosed = act.action_type === 'closed'
                  const isReopened = act.action_type === 'reopened'

                  return (
                    <div key={act.id} className="relative pl-8 space-y-1.5 group">
                      {/* Timeline dot */}
                      <span
                        className={`absolute left-1.5 top-1.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                          isTransfer
                            ? 'bg-amber-500 border-amber-300 ring-4 ring-amber-500/20'
                            : isEscalation
                            ? 'bg-rose-500 border-rose-300 ring-4 ring-rose-500/20'
                            : isClosed
                            ? 'bg-emerald-500 border-emerald-300 ring-4 ring-emerald-500/20'
                            : isReopened
                            ? 'bg-orange-500 border-orange-300 ring-4 ring-orange-500/20'
                            : 'bg-blue-500 border-blue-300 ring-4 ring-blue-500/20'
                        }`}
                      />

                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded ${
                              isTransfer
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : isEscalation
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : isClosed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isReopened
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {typeClean}
                            {isTransfer && Boolean(act.meta?.transferred_to) && (
                              <span className="normal-case ml-1 font-mono">
                                → {String(act.meta.transferred_to)}
                              </span>
                            )}
                          </span>

                          {act.bureau && (
                            <span className="font-mono text-slate-400">({act.bureau})</span>
                          )}
                          {act.officer && (
                            <span className="text-slate-400">by {act.officer}</span>
                          )}
                        </div>

                        <span className="text-slate-500 text-[11px]">
                          {formatDateTime(act.created_at)}
                        </span>
                      </div>

                      {act.remarks && (
                        <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                          {act.remarks}
                        </p>
                      )}

                      {/* Documents attached */}
                      {act.documents && act.documents.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {act.documents.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => handleDownload(doc)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-blue-300 text-xs border border-slate-700 transition-colors"
                              title={`Download ${doc.file_name}`}
                            >
                              <FileText size={12} />
                              <span className="truncate max-w-[200px]">{doc.file_name}</span>
                              <Download size={11} className="text-slate-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* FD8: Add-Action Form */}
          <div className="glass rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <CornerDownRight size={16} className="text-blue-400" />
              Record Case Action / Movement
            </h2>

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            {actionMutation.isError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{(actionMutation.error as any)?.message || 'Action failed.'}</span>
                  {uploadFailureActionId && (
                    <button
                      type="button"
                      onClick={() => retryUploadMutation.mutate()}
                      disabled={retryUploadMutation.isPending}
                      className="mt-2 block px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium"
                    >
                      {retryUploadMutation.isPending ? 'Retrying...' : 'Retry File Upload'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitAction} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Action Type */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Action Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => handleActionTypeChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {isDisposed ? (
                      <>
                        <option value="remark">Remark (Note)</option>
                        <option value="reopened">Reopen Case</option>
                      </>
                    ) : (
                      <>
                        <option value="remark">Remark (Internal Note)</option>
                        <option value="assigned">Assigned</option>
                        <option value="notice_issued">Notice Issued</option>
                        <option value="inspection">Inspection Scheduled</option>
                        <option value="transfer">Transfer to Other Bureau</option>
                        <option value="escalation">Escalate to Senior Officer</option>
                        <option value="closed">Close / Dispose</option>
                        <option value="reopened">Reopen Case</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Transfer to (Shown only when actionType === 'transfer') */}
                {actionType === 'transfer' ? (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Transfer to Bureau / Cell <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className={`w-full bg-slate-900 border ${
                        formErrors.transfer_to ? 'border-rose-500' : 'border-slate-700'
                      } rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    >
                      <option value="">Select destination bureau...</option>
                      {meta?.bureaus
                        ?.filter((b) => b.code !== c.bureau)
                        .map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.code} — {b.name}
                          </option>
                        ))}
                    </select>
                    {formErrors.transfer_to && (
                      <p className="text-rose-400 text-[11px] mt-1">{formErrors.transfer_to}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Update Case Status <span className="text-slate-500">(Optional)</span>
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      disabled={actionType === 'reopened'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Keep current status ({c.status})</option>
                      {meta?.statuses?.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Remarks / Action Notes{' '}
                  {actionType === 'remark' && <span className="text-rose-400">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Record summary of action, hearing decision, observation..."
                  className={`w-full bg-slate-900 border ${
                    formErrors.remarks ? 'border-rose-500' : 'border-slate-700'
                  } rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>{remarks.length} / 2,000 characters</span>
                  {formErrors.remarks && (
                    <span className="text-rose-400">{formErrors.remarks}</span>
                  )}
                </div>
              </div>

              {/* Document upload */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Attach Supporting Document{' '}
                  <span className="text-slate-500">(Optional, PDF, PNG, JPG, DOCX, TXT up to 10MB)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
                {fileError && <p className="text-rose-400 text-[11px] mt-1">{fileError}</p>}
                {selectedFile && !fileError && (
                  <p className="text-emerald-400 text-[11px] mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={actionMutation.isPending || !!fileError}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                >
                  {actionMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving Action...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Save Action
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1/3 width): Overlap Panel */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={15} className="text-orange-400" />
                Cross-Case Overlaps
              </h3>
              <span className="text-xs text-slate-500">Stage 6 Engine (Read-only)</span>
            </div>

            {overlaps.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-1.5">
                <p>No overlap links recorded for this case.</p>
                <p className="text-[11px] text-slate-600">
                  No cross-case overlaps flagged for this complaint.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {overlaps.map((o) => (
                  <div
                    key={o.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          o.level === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : o.level === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {o.level} overlap
                      </span>
                      <span className="font-mono text-slate-400">
                        {Math.round(o.probability * 100)}% match
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Link
                        to={`/cases/${o.other_case_id}`}
                        className="font-mono text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>{o.other_case_ref || `Case #${o.other_case_id}`}</span>
                        <ArrowRight size={12} />
                      </Link>
                      <StatusBadge status={o.status} />
                    </div>

                    {o.explanation && (
                      <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                        {o.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
