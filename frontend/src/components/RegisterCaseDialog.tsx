// src/components/RegisterCaseDialog.tsx — FD10 & Stage 6 Overlap Engine (F-D1, F-D2)
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Loader2,
  Building2,
  AlertTriangle,
  Shield,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react'
import { resolveInstitution, createCase } from '../lib/api'
import { useFilterMeta, useDebounce } from '../lib/format'
import type {
  InstitutionCandidate,
  ResolveInstitutionResult,
  CaseCreateResponse,
} from '../lib/types'

interface RegisterCaseDialogProps {
  open: boolean
  onClose: () => void
  triggerRef?: React.RefObject<HTMLButtonElement | null>
}

export default function RegisterCaseDialog({ open, onClose, triggerRef }: RegisterCaseDialogProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const modalRef = useRef<HTMLDivElement>(null)

  const { data: meta } = useFilterMeta()

  // Form fields
  const [instName, setInstName] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<InstitutionCandidate | null>(null)
  const [aicteId, setAicteId] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [bureauCode, setBureauCode] = useState('')
  const [priority, setPriority] = useState('normal')
  const [sensitive, setSensitive] = useState(false)
  const [description, setDescription] = useState('')

  // Candidate dropdown state
  const [showDropdown, setShowDropdown] = useState(false)
  // F-D1: 400 ms debounce
  const debouncedInstSearch = useDebounce(instName, 400)

  // Errors & Result states
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverCandidates, setServerCandidates] = useState<InstitutionCandidate[]>([])
  // F-D2: Post-submission result panel
  const [submissionResult, setSubmissionResult] = useState<CaseCreateResponse | null>(null)

  // Default bureau and category once meta loads
  useEffect(() => {
    if (meta?.categories?.length && !category) {
      setCategory(meta.categories[0].code)
    }
    if (meta?.bureaus?.length && !bureauCode) {
      setBureauCode(meta.bureaus[0].code)
    }
  }, [meta, category, bureauCode])

  // F-D1: Call GET /api/institutions/resolve with 400ms debounce and at least 4 characters
  const shouldResolve = debouncedInstSearch.trim().length >= 4 && !selectedCandidate
  const { data: resolveResult, isFetching: isResolving } = useQuery<ResolveInstitutionResult>({
    queryKey: ['inst-resolve-dialog', debouncedInstSearch, city, aicteId],
    queryFn: () => resolveInstitution(debouncedInstSearch.trim(), city.trim() || undefined, aicteId.trim() || undefined),
    enabled: shouldResolve,
    staleTime: 30_000,
  })

  const candidates: InstitutionCandidate[] = (
    resolveResult?.candidates?.length ? resolveResult.candidates : serverCandidates
  ).slice(0, 5)

  const handleClose = () => {
    setServerError(null)
    setServerCandidates([])
    setSubmissionResult(null)
    setSelectedCandidate(null)
    setInstName('')
    setAicteId('')
    setCity('')
    setDescription('')
    setErrors({})
    onClose()
    triggerRef?.current?.focus()
  }

  // Focus trap & Escape listener for accessibility
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const timer = setTimeout(() => {
      const firstInput = modalRef.current?.querySelector<HTMLElement>('input, select, textarea')
      firstInput?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [open, onClose, triggerRef])

  // Choose a candidate (F2)
  const handleSelectCandidate = (item: InstitutionCandidate) => {
    setSelectedCandidate(item)
    setInstName(item.name)
    if (item.aicte_permanent_id) setAicteId(item.aicte_permanent_id)
    if (item.city) setCity(item.city)
    setShowDropdown(false)
    setErrors((prev) => ({ ...prev, institution_name: '' }))
    setServerError(null)
  }

  const handleClearSelectedCandidate = () => {
    setSelectedCandidate(null)
    setShowDropdown(true)
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createCase,
    onSuccess: (data: CaseCreateResponse) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['overlaps'] })
      // F-D2: Show result panel in dialog
      setSubmissionResult(data)
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail
      if (typeof detail === 'object' && detail !== null) {
        setServerError(detail.message || 'Institution resolution failed; please select a candidate')
        if (Array.isArray(detail.candidates) && detail.candidates.length > 0) {
          setServerCandidates(detail.candidates)
          setShowDropdown(true)
        }
      } else {
        const msg = detail || err.message || 'Failed to register case'
        setServerError(msg)
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const errs: Record<string, string> = {}

    if (!instName.trim()) {
      errs.institution_name = 'Institution name is required'
    }

    // F-D1 & F3: If needs_review or no candidate picked when resolution requires review
    if (
      !selectedCandidate &&
      resolveResult &&
      (resolveResult.needs_review || resolveResult.institution_id === null)
    ) {
      errs.institution_name =
        'Institution resolution requires verification. Please choose a candidate from the list below.'
      setShowDropdown(true)
    }

    if (!description.trim()) {
      errs.description = 'Description is required'
    } else if (description.trim().length < 5) {
      errs.description = 'Description must be at least 5 characters'
    }
    if (!category) {
      errs.category = 'Category is required'
    }
    if (!bureauCode) {
      errs.bureau_code = 'Bureau is required'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    createMutation.mutate({
      institution_name: instName.trim(),
      institution_id: selectedCandidate ? selectedCandidate.id : undefined,
      aicte_id: aicteId.trim() || undefined,
      city: city.trim() || undefined,
      category,
      bureau_code: bureauCode,
      priority,
      sensitive,
      description: description.trim(),
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-case-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Building2 size={20} />
            </div>
            <div>
              <h2 id="register-case-title" className="text-lg font-semibold text-white">
                {submissionResult ? 'Case Intake Result' : 'Register New Case'}
              </h2>
              <p className="text-xs text-slate-400">
                {submissionResult
                  ? 'Intake complete with automated overlap analysis'
                  : 'Intake complaint with AICTE master resolution & overlap engine'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Switch between Form and Result Panel (F-D2) */}
        {submissionResult ? (
          /* ── F-D2: Post-Submission Result Panel ──────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Success Summary Header */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-3">
              <CheckCircle2 size={22} className="shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-200">
                  Case Registered: {submissionResult.case_ref || `CASE-${submissionResult.id}`}
                </h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Record saved to case register with initial action log.
                </p>
              </div>
            </div>

            {/* Institution Match Confidence / Amber Banner */}
            {submissionResult.institution_match && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  submissionResult.institution_match.needs_review ||
                  submissionResult.institution_review_needed
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    {submissionResult.institution_match.needs_review ||
                    submissionResult.institution_review_needed ? (
                      <>
                        <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                        <span className="font-semibold text-amber-300">
                          Low-confidence institution match; please verify
                        </span>
                      </>
                    ) : (
                      <>
                        <Check size={15} className="text-emerald-400 shrink-0" />
                        <span className="text-slate-200 font-semibold">
                          Institution Confirmed
                        </span>
                      </>
                    )}
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40 text-slate-300">
                    Confidence: {(submissionResult.institution_match.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {submissionResult.institution_match.reason && (
                  <p className="text-[11px] text-slate-400 pl-6">
                    Reason: <span className="font-mono">{submissionResult.institution_match.reason}</span>
                  </p>
                )}
              </div>
            )}

            {/* Overlap Scan Error Warning (if any) */}
            {submissionResult.overlap_scan_error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span>
                  <strong>Warning:</strong> {submissionResult.overlap_scan_error}
                </span>
              </div>
            )}

            {/* Overlap Results Panel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-400" />
                  Overlap Analysis Results
                </h4>
                <span className="text-xs font-mono text-slate-400">
                  {submissionResult.overlaps?.length || 0} link(s) found
                </span>
              </div>

              {!submissionResult.overlaps || submissionResult.overlaps.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p className="font-medium text-slate-300">No cross-case overlaps detected</p>
                  <p className="text-[11px] text-slate-500">
                    The complaint narrative and institution record do not trigger high or medium similarity flags.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {submissionResult.overlaps.map((o) => (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/70 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              o.level === 'high'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : o.level === 'medium'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-slate-700/50 text-slate-300 border-slate-600'
                            }`}
                          >
                            {o.level} overlap
                          </span>
                          <span className="font-mono text-slate-300">
                            {Math.round(o.probability * 100)}% match
                          </span>
                        </div>

                        <Link
                          to={`/cases/${o.other_case_id}`}
                          onClick={handleClose}
                          className="font-mono text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 text-xs"
                        >
                          <span>{o.other_case_ref || `Case #${o.other_case_id}`}</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>

                      {o.explanation && (
                        <p className="text-slate-300 text-[11px] leading-relaxed pl-1 border-l-2 border-slate-700">
                          {o.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose()
                  navigate(`/cases/${submissionResult.id}`)
                }}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
              >
                <span>Go to Case Detail</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ) : (
          /* ── Registration Form ──────────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {serverError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <p className="font-medium">Action Required</p>
                  <p className="text-xs text-rose-300/90 mt-0.5">{serverError}</p>
                </div>
              </div>
            )}

            {/* F-D1: Institution Autocomplete & Resolver */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Institution Name <span className="text-rose-400">*</span>
                </label>
                {selectedCandidate && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <Check size={12} /> Confirmed Selection
                  </span>
                )}
              </div>

              {selectedCandidate ? (
                /* Selected candidate card */
                <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/40 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {selectedCandidate.name}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      {selectedCandidate.city && <span>{selectedCandidate.city}</span>}
                      <span>·</span>
                      <span>{selectedCandidate.region} Region</span>
                      {selectedCandidate.aicte_permanent_id && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-slate-300">{selectedCandidate.aicte_permanent_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedCandidate}
                    className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                /* Input with debounce resolver */
                <div className="relative">
                  <input
                    type="text"
                    value={instName}
                    onChange={(e) => {
                      setInstName(e.target.value)
                      setShowDropdown(true)
                      if (errors.institution_name) {
                        setErrors((prev) => ({ ...prev, institution_name: '' }))
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Type name (e.g. Government Engineering College)..."
                    className={`w-full bg-slate-800/80 border ${
                      errors.institution_name ? 'border-rose-500' : 'border-slate-700'
                    } rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {isResolving && (
                    <div className="absolute right-3 top-2.5 text-slate-400">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  )}
                </div>
              )}

              {errors.institution_name && (
                <p className="text-xs text-rose-400 mt-1">{errors.institution_name}</p>
              )}

              {/* Candidates dropdown: up to 5 with score */}
              {!selectedCandidate && showDropdown && candidates.length > 0 && (
                <div className="mt-1.5 bg-slate-800/95 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-700/60 z-20">
                  <div className="px-3 py-1.5 bg-slate-900/60 text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Suggested Institutions ({candidates.length})</span>
                    <span>Click to confirm</span>
                  </div>
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCandidate(c)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-blue-600/10 hover:border-l-2 hover:border-blue-500 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white group-hover:text-blue-300 truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {c.city && <span>{c.city}</span>}
                          <span>({c.region} Region)</span>
                          {c.aicte_permanent_id && (
                            <span className="font-mono text-slate-400">· {c.aicte_permanent_id}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                          Score: {(c.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AICTE ID and City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  AICTE Permanent ID <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={aicteId}
                  onChange={(e) => setAicteId(e.target.value)}
                  placeholder="1-XXXXXXXX"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  City <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Bureau & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Bureau / Cell <span className="text-rose-400">*</span>
                </label>
                <select
                  value={bureauCode}
                  onChange={(e) => setBureauCode(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {meta?.bureaus?.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {meta?.categories?.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority & Sensitive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="pt-5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sensitive}
                    onChange={(e) => setSensitive(e.target.checked)}
                    className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-800"
                  />
                  <span className="text-sm text-slate-300 flex items-center gap-1.5">
                    <Shield size={14} className="text-rose-400" />
                    Mark as Sensitive Case
                  </span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Case Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: '' }))
                  }
                }}
                placeholder="Detail the complaint allegations, facts, affected courses or faculty..."
                className={`w-full bg-slate-800/80 border ${
                  errors.description ? 'border-rose-500' : 'border-slate-700'
                } rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.description && (
                <p className="text-xs text-rose-400 mt-1">{errors.description}</p>
              )}
            </div>

            {/* Footer buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Registering & Analyzing...
                  </>
                ) : (
                  'Register Case'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
