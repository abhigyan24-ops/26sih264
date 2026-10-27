// src/components/RegisterCaseDialog.tsx — FD10 & Stage 6 Overlap Engine (F-D1, F-D2)
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Loader2,
  Building2,
  AlertTriangle,
  Lock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react'
import { resolveInstitution, createCase } from '../lib/api'
import { useFilterMeta, useDebounce } from '../lib/format'
import { LevelBadge } from '../ui/LevelBadge'
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-case-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DAD6CC] bg-[#F6F5F1]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[4px] bg-[#E8F0FE] text-[#1F3A5F]">
              <Building2 size={18} />
            </div>
            <div>
              <h2 id="register-case-title" className="text-base font-semibold text-[#1B1F24]">
                {submissionResult ? 'Case Intake Result' : 'Register New Case'}
              </h2>
              <p className="text-xs text-[#5B6068]">
                {submissionResult
                  ? 'Intake complete with automated overlap analysis'
                  : 'Intake complaint with AICTE master resolution & overlap engine'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-[4px] text-[#5B6068] hover:text-[#1B1F24] hover:bg-[#EFEDE7] transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Switch between Form and Result Panel (F-D2) */}
        {submissionResult ? (
          /* ── F-D2: Post-Submission Result Panel ──────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F6F5F1]">
            {/* Success Summary Header */}
            <div className="p-4 rounded-[4px] bg-[#E6F4EC] border border-[#A8E2C2] text-[#067647] flex items-start gap-3">
              <CheckCircle2 size={20} className="shrink-0 text-[#067647] mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#067647] text-sm">
                  Case Registered: {submissionResult.case_ref || `CASE-${submissionResult.id}`}
                </h3>
                <p className="text-xs text-[#067647]/90 mt-0.5">
                  Record saved to case register with initial action log.
                </p>
              </div>
            </div>

            {/* Institution Match Confidence / Amber Banner */}
            {submissionResult.institution_match && (
              <div
                className={`p-4 rounded-[4px] border text-xs space-y-1.5 ${
                  submissionResult.institution_match.needs_review ||
                  submissionResult.institution_review_needed
                    ? 'bg-[#FFF3E0] border-[#FCD299] text-[#9A4A00]'
                    : 'bg-[#FFFFFF] border-[#DAD6CC] text-[#1B1F24]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    {submissionResult.institution_match.needs_review ||
                    submissionResult.institution_review_needed ? (
                      <>
                        <AlertTriangle size={15} className="text-[#B54708] shrink-0" />
                        <span className="font-semibold text-[#9A4A00]">
                          Low-confidence institution match; please verify
                        </span>
                      </>
                    ) : (
                      <>
                        <Check size={15} className="text-[#067647] shrink-0" />
                        <span className="text-[#1B1F24] font-semibold">
                          Institution Confirmed
                        </span>
                      </>
                    )}
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-[4px] bg-[#EFEDE7] text-[#5B6068]">
                    Confidence: {(submissionResult.institution_match.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {submissionResult.institution_match.reason && (
                  <p className="text-[11px] text-[#5B6068] pl-6">
                    Reason: <span className="font-mono">{submissionResult.institution_match.reason}</span>
                  </p>
                )}
              </div>
            )}

            {/* Overlap Scan Error Warning (if any) */}
            {submissionResult.overlap_scan_error && (
              <div className="p-3.5 rounded-[4px] bg-[#FDECEA] border border-[#F8B7B2] text-[#B42318] text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#B42318] shrink-0" />
                <span>
                  <strong>Warning:</strong> {submissionResult.overlap_scan_error}
                </span>
              </div>
            )}

            {/* Overlap Results Panel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-2">
                <h4 className="text-xs font-semibold text-[#1B1F24] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#2a78d6]" />
                  Overlap Analysis Results
                </h4>
                <span className="text-xs font-mono text-[#5B6068]">
                  {submissionResult.overlaps?.length || 0} link(s) found
                </span>
              </div>

              {!submissionResult.overlaps || submissionResult.overlaps.length === 0 ? (
                <div className="p-6 text-center rounded-[4px] bg-[#FFFFFF] border border-[#DAD6CC] text-xs text-[#5B6068] space-y-1">
                  <p className="font-medium text-[#1B1F24]">No cross-case overlaps detected</p>
                  <p className="text-[11px] text-[#5B6068]">
                    The complaint narrative and institution record do not trigger high or medium similarity flags.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {submissionResult.overlaps.map((o) => (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-[4px] bg-[#FFFFFF] border border-[#DAD6CC] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LevelBadge level={o.level} />
                          <span className="font-mono text-xs text-[#1B1F24]">
                            {Math.round(o.probability * 100)}% match
                          </span>
                        </div>

                        <Link
                          to={`/cases/${o.other_case_id}`}
                          onClick={handleClose}
                          className="font-mono text-[#2a78d6] hover:underline flex items-center gap-1 text-xs"
                        >
                          <span>{o.other_case_ref || `Case #${o.other_case_id}`}</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>

                      {o.explanation && (
                        <p className="text-[#5B6068] text-[11px] leading-relaxed pl-2 border-l-2 border-[#DAD6CC]">
                          {o.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#DAD6CC]">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-[4px] text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose()
                  navigate(`/cases/${submissionResult.id}`)
                }}
                className="px-4 py-2 rounded-[4px] text-xs font-medium bg-[#1F3A5F] hover:bg-[#17304F] text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Go to Case Detail</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* ── Registration Form ──────────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {serverError && (
              <div className="p-3.5 rounded-[4px] bg-[#FDECEA] border border-[#F8B7B2] text-[#B42318] text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[#B42318]" />
                <div>
                  <p className="font-medium">Action Required</p>
                  <p className="text-[11px] mt-0.5">{serverError}</p>
                </div>
              </div>
            )}

            {/* F-D1: Institution Autocomplete & Resolver */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#1B1F24]">
                  Institution Name <span className="text-[#B42318]">*</span>
                </label>
                {selectedCandidate && (
                  <span className="text-[11px] text-[#067647] flex items-center gap-1 font-medium">
                    <Check size={12} /> Confirmed Selection
                  </span>
                )}
              </div>

              {selectedCandidate ? (
                /* Selected candidate card */
                <div className="p-3 rounded-[4px] bg-[#E8F0FE] border border-[#B2CCF8] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#1F3A5F] truncate">
                      {selectedCandidate.name}
                    </div>
                    <div className="text-[11px] text-[#5B6068] flex items-center gap-2 mt-0.5">
                      {selectedCandidate.city && <span>{selectedCandidate.city}</span>}
                      <span>·</span>
                      <span>{selectedCandidate.region} Region</span>
                      {selectedCandidate.aicte_permanent_id && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[#1B1F24]">{selectedCandidate.aicte_permanent_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedCandidate}
                    className="text-xs px-2.5 py-1 rounded-[4px] bg-[#FFFFFF] hover:bg-[#EFEDE7] text-[#1B1F24] border border-[#DAD6CC] transition-colors"
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
                    placeholder="Type college name or keyword (e.g. Government Engineering College)..."
                    className={`w-full bg-[#FFFFFF] border ${
                      errors.institution_name ? 'border-[#B42318]' : 'border-[#DAD6CC]'
                    } rounded-[4px] px-3 py-2 text-xs text-[#1B1F24] placeholder-[#8C8A82] focus:outline-none focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]`}
                  />
                  {isResolving && (
                    <div className="absolute right-3 top-2.5 text-[#5B6068]">
                      <Loader2 size={15} className="animate-spin" />
                    </div>
                  )}
                </div>
              )}

              {errors.institution_name && (
                <p className="text-[11px] text-[#B42318] mt-1">{errors.institution_name}</p>
              )}

              {/* Candidates dropdown: up to 5 with score */}
              {!selectedCandidate && showDropdown && candidates.length > 0 && (
                <div className="mt-1.5 bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] shadow-lg max-h-56 overflow-y-auto divide-y divide-[#DAD6CC] z-20">
                  <div className="px-3 py-1.5 bg-[#F6F5F1] text-[11px] font-medium text-[#5B6068] flex items-center justify-between">
                    <span>Suggested Institutions ({candidates.length})</span>
                    <span>Click to confirm</span>
                  </div>
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCandidate(c)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[#F6F5F1] transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1B1F24] group-hover:text-[#1F3A5F] truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-[#5B6068] flex items-center gap-2 mt-0.5">
                          {c.city && <span>{c.city}</span>}
                          <span>({c.region} Region)</span>
                          {c.aicte_permanent_id && (
                            <span className="font-mono text-[#5B6068]">· {c.aicte_permanent_id}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#EFEDE7] text-[#1B1F24] border border-[#DAD6CC]">
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
                <label className="block text-xs font-medium text-[#1B1F24] mb-1">
                  AICTE Permanent ID <span className="text-[#5B6068] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={aicteId}
                  onChange={(e) => setAicteId(e.target.value)}
                  placeholder="1-XXXXXXXX"
                  className="w-full bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] px-3 py-2 text-xs text-[#1B1F24] placeholder-[#8C8A82] focus:outline-none focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1B1F24] mb-1">
                  City <span className="text-[#5B6068] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune"
                  className="w-full bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] px-3 py-2 text-xs text-[#1B1F24] placeholder-[#8C8A82] focus:outline-none focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]"
                />
              </div>
            </div>

            {/* Bureau & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#1B1F24] mb-1">
                  Bureau / Cell <span className="text-[#B42318]">*</span>
                </label>
                <select
                  value={bureauCode}
                  onChange={(e) => setBureauCode(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] px-3 py-2 text-xs text-[#1B1F24] focus:outline-none focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]"
                >
                  {meta?.bureaus?.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1B1F24] mb-1">
                  Category <span className="text-[#B42318]">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] px-3 py-2 text-xs text-[#1B1F24] focus:outline-none focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-medium text-[#1B1F24] mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] px-3 py-2 text-xs text-[#1B1F24] focus:outline-none focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sensitive}
                    onChange={(e) => setSensitive(e.target.checked)}
                    className="mt-0.5 rounded-[2px] border-[#DAD6CC] text-[#1F3A5F] focus:ring-[#1F3A5F]"
                  />
                  <div>
                    <span className="text-xs font-medium text-[#1B1F24] flex items-center gap-1.5">
                      <Lock size={13} className="text-[#1F3A5F]" />
                      Mark as Sensitive Case
                    </span>
                    <p className="text-[11px] text-[#5B6068] mt-0.5">
                      Restricts cross-bureau visibility and masks personal identifiers in general listings.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Description with Character Counter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#1B1F24]">
                  Case Description <span className="text-[#B42318]">*</span>
                </label>
                <span className="text-[11px] font-mono text-[#5B6068]">
                  {description.length} chars
                </span>
              </div>
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
                className={`w-full bg-[#FFFFFF] border ${
                  errors.description ? 'border-[#B42318]' : 'border-[#DAD6CC]'
                } rounded-[4px] px-3 py-2 text-xs text-[#1B1F24] placeholder-[#8C8A82] focus:outline-none focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]`}
              />
              {errors.description && (
                <p className="text-[11px] text-[#B42318] mt-1">{errors.description}</p>
              )}
            </div>

            {/* Footer buttons */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#DAD6CC]">
              <button
                type="button"
                onClick={handleClose}
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-[4px] text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-[4px] text-xs font-medium bg-[#1F3A5F] hover:bg-[#17304F] disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Registering & Analyzing...</span>
                  </>
                ) : (
                  <span>Register Case</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
