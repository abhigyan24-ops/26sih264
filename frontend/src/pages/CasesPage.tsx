import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, Filter, Download, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react'
import { getCases } from '../lib/api'

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
  const [filters, setFilters] = useState({
    q: '', bureau: '', category: '', status: '', overdue: false, limit: 50
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases', filters],
    queryFn: () => getCases(Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== false)
    )),
  })

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
    </div>
  )
}
