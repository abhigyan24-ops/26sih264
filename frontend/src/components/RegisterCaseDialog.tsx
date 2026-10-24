// src/components/RegisterCaseDialog.tsx — FD10
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, Building2, AlertTriangle, Shield } from 'lucide-react'
import { searchInstitutions, createCase } from '../lib/api'
import { useFilterMeta, useDebounce } from '../lib/format'
import type { InstitutionSearchResult } from '../lib/types'

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
  const [aicteId, setAicteId] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [bureauCode, setBureauCode] = useState('')
  const [priority, setPriority] = useState('normal')
  const [sensitive, setSensitive] = useState(false)
  const [description, setDescription] = useState('')

  // Autocomplete
  const [showDropdown, setShowDropdown] = useState(false)
  const debouncedInstSearch = useDebounce(instName, 300)

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  // Default bureau and category once meta loads
  useEffect(() => {
    if (meta?.categories?.length && !category) {
      setCategory(meta.categories[0].code)
    }
    if (meta?.bureaus?.length && !bureauCode) {
      setBureauCode(meta.bureaus[0].code)
    }
  }, [meta, category, bureauCode])

  // Institution search query
  const { data: searchResults = [], isFetching: isSearching } = useQuery<InstitutionSearchResult[]>({
    queryKey: ['inst-search-dialog', debouncedInstSearch],
    queryFn: () => searchInstitutions(debouncedInstSearch),
    enabled: debouncedInstSearch.trim().length >= 2,
    staleTime: 60_000,
  })

  const handleClose = () => {
    setServerError(null)
    setErrors({})
    onClose()
    triggerRef?.current?.focus()
  }

  // Focus trap & Escape listener for E15 accessibility
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
    // Focus first input
    const timer = setTimeout(() => {
      const firstInput = modalRef.current?.querySelector<HTMLElement>('input, select, textarea')
      firstInput?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [open, onClose, triggerRef])

  const handleSelectInstitution = (item: InstitutionSearchResult) => {
    setInstName(item.name)
    if (item.aicte_permanent_id) setAicteId(item.aicte_permanent_id)
    if (item.city) setCity(item.city)
    setShowDropdown(false)
  }

  const createMutation = useMutation({
    mutationFn: createCase,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      handleClose()
      // Navigate to the newly created case
      navigate(`/cases/${data.id}`, {
        state: {
          institution_review_needed: data.institution_review_needed,
          overlaps_count: data.overlaps?.length || 0,
        },
      })
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to register case'
      setServerError(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const errs: Record<string, string> = {}

    if (!instName.trim()) {
      errs.institution_name = 'Institution name is required'
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-case-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Building2 size={20} />
            </div>
            <div>
              <h2 id="register-case-title" className="text-lg font-semibold text-white">
                Register New Case
              </h2>
              <p className="text-xs text-slate-400">Intake complaint and link to institution</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-medium">Registration Failed</p>
                <p className="text-xs text-rose-300/90 mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          {/* Institution Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Institution Name <span className="text-rose-400">*</span>
            </label>
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
              {isSearching && (
                <div className="absolute right-3 top-2.5 text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
            </div>
            {errors.institution_name && (
              <p className="text-xs text-rose-400 mt-1">{errors.institution_name}</p>
            )}

            {/* Autocomplete Dropdown */}
            {showDropdown && instName.trim().length >= 2 && searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-700/50">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectInstitution(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-700/60 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{item.name}</div>
                      <div className="text-xs text-slate-400">
                        {item.city ? `${item.city}, ` : ''}{item.region} Region
                      </div>
                    </div>
                    {item.aicte_permanent_id && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                        {item.aicte_permanent_id}
                      </span>
                    )}
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
                  Registering...
                </>
              ) : (
                'Register Case'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
