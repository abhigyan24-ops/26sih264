import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, Filter, Download, AlertTriangle, ChevronRight, Loader2, Plus, X, Shield, CheckCircle2, ExternalLink } from 'lucide-react'
import { getCases, createCase, searchInstitutions } from '../lib/api'

const BUREAUS = ['RB', 'PGRC', 'ROC-N', 'ROC-S', 'ROC-E', 'ROC-W']
const CATEGORIES = ['FACULTY', 'FEES', 'APPROVAL', 'CERTIFICATE', 'INFRA', 'MISREP']
const STATUSES = ['received','registered','assigned','under_process','transferred','escalated','action_taken','disposed','reopened']

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    received: 'badge-muted', registered: 'badge-info', assigned: 'badge-info',
    under_process: 'bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-2 py-0.5 rounded-full',
    escalated: 'badge-high', action_taken: 'badge-success',
    disposed: 'badge-muted', transferred: 'badge-medium', reopened: 'badge-medium',
  }
  return <span className={cls[status] || 'badge-muted'}>{status.replace('_', ' ')}</span>
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span className={`w-2 h-2 rounded-full inline-block ${
      priority === 'high' ? 'bg-rose-500' :
      priority === 'normal' ? 'bg-blue-500' : 'bg-slate-600'
    }`} title={priority} />
  )
}

export default function CasesPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({
    q: '', bureau: '', category: '', status: '', overdue: false, limit: 50
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)

  // New Case Form State
  const [formData, setFormData] = useState({
    aicte_id: '',
    institution_name: '',
    city: '',
    category: 'FACULTY',
    bureau_code: 'RB',
    priority: 'normal',
    sensitive: false,
    description: '',
  })
  const [instSearchQuery, setInstSearchQuery] = useState('')
  const [createdCaseResult, setCreatedCaseResult] = useState<any>(null)

  const { data: instSearchResults = [] } = useQuery({
    queryKey: ['inst-search', instSearchQuery],
    queryFn: () => searchInstitutions(instSearchQuery),
    enabled: instSearchQuery.length >= 2,
  })

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases', filters],
    queryFn: () => getCases(Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== false)
    )),
  })

  const createMutation = useMutation({
    mutationFn: createCase,
    onSuccess: (data) => {
      setCreatedCaseResult(data)
      qc.invalidateQueries({ queryKey: ['cases'] })
    }
  })

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      aicte_id: formData.aicte_id.trim() || undefined,
      institution_name: formData.institution_name.trim() || undefined,
      city: formData.city.trim() || undefined,
      category: formData.category,
      bureau_code: formData.bureau_code,
      priority: formData.priority,
      sensitive: formData.sensitive,
      description: formData.description,
    })
  }

  const set = (k: string, v: any) => setFilters(f => ({ ...f, [k]: v }))

  const exportXlsx = () => window.open('/api/reports/bureau.xlsx', '_blank')
  const exportPdf  = () => window.open('/api/reports/bureau.pdf', '_blank')

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Cases</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading ? 'Loading…' : `${cases.length} result${cases.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCreatedCaseResult(null)
              setShowNewModal(true)
            }}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus size={16} /> Register Case
          </button>
          <button onClick={exportXlsx} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download size={14} /> Excel
          </button>
          <button onClick={exportPdf} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => setShowFilters(v => !v)} className={`btn-secondary text-sm flex items-center gap-1.5 ${showFilters ? 'border-blue-500/50 text-blue-300' : ''}`}>
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Search by case ref, description text…"
          value={filters.q}
          onChange={e => set('q', e.target.value)}
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Bureau / Cell</label>
              <select className="select" value={filters.bureau} onChange={e => set('bureau', e.target.value)}>
                <option value="">All</option>
                {BUREAUS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select className="select" value={filters.category} onChange={e => set('category', e.target.value)}>
                <option value="">All</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Status</label>
              <select className="select" value={filters.status} onChange={e => set('status', e.target.value)}>
                <option value="">All</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-rose-500"
                  checked={filters.overdue}
                  onChange={e => set('overdue', e.target.checked)}
                />
                <span className="text-sm text-rose-400 font-medium">Overdue only</span>
              </label>
            </div>
          </div>
          <button onClick={() => setFilters({ q: '', bureau: '', category: '', status: '', overdue: false, limit: 50 })}
            className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Clear all filters
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500">
                <th className="px-4 py-3 text-left">Case Ref</th>
                <th className="px-4 py-3 text-left">Institution</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Bureau</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Received</th>
                <th className="px-4 py-3 text-left">SLA Due</th>
                <th className="px-4 py-3 text-center">Overlaps</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-12"><Loader2 size={20} className="animate-spin inline text-blue-500" /></td></tr>
              ) : cases.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">No cases found</td></tr>
              ) : (cases as any[]).map(c => (
                <tr key={c.id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PriorityDot priority={c.priority} />
                      <Link to={`/cases/${c.id}`} className="font-mono text-blue-400 hover:text-blue-300 transition-colors text-xs">
                        {c.case_ref}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/institutions/${c.institution_id}`} className="text-slate-300 hover:text-white transition-colors">
                      {c.institution?.length > 40 ? c.institution.slice(0, 40) + '…' : c.institution}
                    </Link>
                    {c.overdue && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertTriangle size={10} className="text-rose-500" />
                        <span className="text-xs text-rose-500">SLA Overdue</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">{c.category}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{c.bureau}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{c.received_date}</td>
                  <td className="px-4 py-3 text-xs font-mono">
                    <span className={c.overdue ? 'text-rose-400' : 'text-slate-500'}>{c.sla_due_date}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.open_high_overlaps > 0 && (
                      <span className="badge-high">{c.open_high_overlaps}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/cases/${c.id}`} className="text-slate-600 hover:text-slate-300 transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Case Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 border border-slate-700 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">Register New Complaint Case</h2>
                  <p className="text-xs text-slate-500">Triggers automated institution resolution, vector embedding & cross-bureau overlap detection</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {createdCaseResult ? (
              <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-emerald-400" />
                  <div>
                    <div className="text-sm font-bold text-emerald-300">Case Successfully Registered!</div>
                    <div className="text-xs text-slate-400">Reference: <span className="font-mono text-emerald-400 font-bold">{createdCaseResult.case_ref || `CASE-${String(createdCaseResult.id).padStart(6, '0')}`}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block">Institution Resolution</span>
                    <span className="text-slate-200 font-medium">{createdCaseResult.institution_review_needed ? 'Flagged for Officer Review' : 'Auto-Resolved'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block">Cross-Bureau Overlaps Found</span>
                    <span className={`font-bold ${createdCaseResult.overlaps_found?.length ? 'text-amber-400' : 'text-slate-300'}`}>
                      {createdCaseResult.overlaps_found?.length || 0} potential link(s)
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    to={`/cases/${createdCaseResult.id}`}
                    className="btn-primary text-xs flex items-center gap-1.5"
                    onClick={() => setShowNewModal(false)}
                  >
                    View Case Details <ExternalLink size={12} />
                  </Link>
                  {createdCaseResult.overlaps_found?.length > 0 && (
                    <Link
                      to="/overlaps"
                      className="btn-secondary text-xs flex items-center gap-1.5 text-amber-400 border-amber-500/30"
                      onClick={() => setShowNewModal(false)}
                    >
                      Review Overlaps ({createdCaseResult.overlaps_found.length})
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setCreatedCaseResult(null)
                      setFormData({
                        aicte_id: '',
                        institution_name: '',
                        city: '',
                        category: 'FACULTY',
                        bureau_code: 'RB',
                        priority: 'normal',
                        sensitive: false,
                        description: '',
                      })
                    }}
                    className="btn-secondary text-xs ml-auto"
                  >
                    Register Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {createMutation.isError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                    {(createMutation.error as any)?.response?.data?.detail || 'Failed to create case. Please verify the institution and details.'}
                  </div>
                )}

                {/* Institution Search / Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Institution Identification</span>
                    <span className="text-[11px] text-slate-500 font-normal">AICTE ID or Raw Intake Name</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <input
                        className="input text-xs"
                        placeholder="AICTE Permanent ID (e.g. 1-10023451)"
                        value={formData.aicte_id}
                        onChange={e => setFormData(f => ({ ...f, aicte_id: e.target.value }))}
                      />
                    </div>
                    <div>
                      <input
                        className="input text-xs"
                        placeholder="City (e.g. Bilaspur, Pune)"
                        value={formData.city}
                        onChange={e => setFormData(f => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <input
                      className="input text-xs"
                      placeholder="Institution Name (e.g. Govt Engg College Bilaspur)"
                      value={formData.institution_name}
                      onChange={e => {
                        const val = e.target.value
                        setFormData(f => ({ ...f, institution_name: val }))
                        setInstSearchQuery(val)
                      }}
                      required={!formData.aicte_id}
                    />
                  </div>

                  {/* Autocomplete / match preview chips */}
                  {instSearchResults.length > 0 && formData.institution_name && (
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 space-y-1.5 max-h-36 overflow-y-auto">
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Matching Master Institutions:</div>
                      {instSearchResults.slice(0, 3).map((inst: any) => (
                        <div
                          key={inst.id}
                          onClick={() => {
                            setFormData(f => ({
                              ...f,
                              institution_name: inst.name,
                              aicte_id: inst.aicte_permanent_id || '',
                              city: inst.city || f.city,
                            }))
                            setInstSearchQuery('')
                          }}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-slate-700/60 cursor-pointer text-xs transition-colors"
                        >
                          <span className="text-slate-200 truncate">{inst.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-blue-400">{inst.aicte_permanent_id}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                              {(inst.score * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bureau, Category, Priority */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Receiving Bureau</label>
                    <select
                      className="select text-xs"
                      value={formData.bureau_code}
                      onChange={e => setFormData(f => ({ ...f, bureau_code: e.target.value }))}
                    >
                      {BUREAUS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Complaint Category</label>
                    <select
                      className="select text-xs"
                      value={formData.category}
                      onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Priority</label>
                    <select
                      className="select text-xs"
                      value={formData.priority}
                      onChange={e => setFormData(f => ({ ...f, priority: e.target.value }))}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                </div>

                {/* Sensitive Case Toggle */}
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className={formData.sensitive ? 'text-amber-400' : 'text-slate-500'} />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Sensitive Whistleblower / Legal Case</div>
                      <div className="text-[11px] text-slate-500">Forces strictly offline processing &mdash; never sends data to cloud LLM</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                    checked={formData.sensitive}
                    onChange={e => setFormData(f => ({ ...f, sensitive: e.target.checked }))}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Complaint Narrative / Description</label>
                  <textarea
                    rows={4}
                    className="input text-xs leading-relaxed"
                    placeholder="Enter detailed facts, allegation details, affected batch/course, dates..."
                    value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Register &amp; Scan Overlaps
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
