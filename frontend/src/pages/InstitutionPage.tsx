// src/pages/InstitutionPage.tsx — FD9
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  AlertOctagon,
  Loader2,
} from 'lucide-react'
import { useInstitution, formatDate, StatusBadge, SlaBadge } from '../lib/format'

export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>()
  const instId = Number(id)

  const { data, isLoading, isError, error } = useInstitution(instId)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm text-slate-400">Loading Institution 360 profile...</p>
      </div>
    )
  }

  if (isError || !data?.institution) {
    const is404 = (error as any)?.response?.status === 404
    return (
      <div className="p-6 max-w-2xl mx-auto my-12 text-center space-y-4 glass rounded-2xl border border-slate-800">
        <div className="inline-flex p-3 rounded-full bg-slate-800/80 text-slate-400">
          <AlertOctagon size={32} />
        </div>
        <h2 className="text-xl font-bold text-white">
          {is404 ? 'Institution Not Found' : 'Error Loading Institution'}
        </h2>
        <p className="text-sm text-slate-400">
          {is404
            ? 'This institution does not exist or falls outside your regional jurisdiction.'
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

  const {
    institution: inst,
    cases = [],
    repeat_categories = [],
    active_by_bureau = [],
    overlaps = [],
    stats = { total: 0, open: 0, disposed: 0, overdue: 0 },
  } = data

  const multipleBureausActive = active_by_bureau.length >= 2

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

      {/* Profile Card (FD9) */}
      <div className="glass rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {inst.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                {inst.aicte_permanent_id && (
                  <span>
                    AICTE Permanent ID:{' '}
                    <code className="font-mono text-slate-200 font-semibold">
                      {inst.aicte_permanent_id}
                    </code>
                  </span>
                )}
                <span>
                  Region: <span className="text-slate-200">{inst.region}</span>
                </span>
                {inst.inst_type && (
                  <span>
                    Type: <span className="text-slate-200">{inst.inst_type}</span>
                  </span>
                )}
              </div>
              {(inst.address || inst.city || inst.state) && (
                <div className="text-xs text-slate-500 mt-1">
                  {[inst.address, inst.city, inst.state].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
            <div className="text-2xl font-bold text-white font-mono">{stats.total}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
              Total Cases
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
            <div className="text-2xl font-bold text-blue-400 font-mono">{stats.open}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
              Active / Open
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
            <div className="text-2xl font-bold text-emerald-400 font-mono">{stats.disposed}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
              Disposed
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
            <div className="text-2xl font-bold text-rose-400 font-mono">{stats.overdue}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
              Overdue
            </div>
          </div>
        </div>
      </div>

      {/* "Who is Active Now" Strip (FD9) */}
      <div className="glass rounded-2xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers size={16} className="text-blue-400" />
            Who is Dealing with this Institution Right Now?
          </h2>
          <span className="text-xs text-slate-500">Active Units</span>
        </div>

        {active_by_bureau.length === 0 ? (
          <p className="text-xs text-slate-500">No active cases currently pending across any bureau.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2.5">
              {active_by_bureau.map((b) => (
                <div
                  key={b.bureau}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/60 border border-blue-500/30 text-xs"
                >
                  <span className="font-mono font-bold text-blue-300">{b.bureau}</span>
                  <span className="text-slate-400">({b.bureau_name}):</span>
                  <span className="font-semibold text-white font-mono">{b.open_cases} open</span>
                </div>
              ))}
            </div>

            {multipleBureausActive && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-400" />
                <span>
                  <strong>Multiple units are handling this institution.</strong> Parallel action
                  coordination recommended across Bureaus.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Repeat Categories */}
        {repeat_categories.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Repeat Complaint Categories
            </div>
            <div className="flex flex-wrap gap-2">
              {repeat_categories.map((rc) => (
                <span
                  key={rc.category}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium"
                >
                  <span>{rc.label || rc.category}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[11px] font-mono text-amber-400 border border-slate-700">
                    {rc.n}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cases Table: All Cases from All Bureaus */}
      <div className="glass rounded-2xl border border-slate-800 overflow-hidden shadow-lg space-y-0">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText size={16} className="text-blue-400" />
              All Cases from All Bureaus & Cells
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive chronological complaint record across RB, PGRC, and Regional Cells
            </p>
          </div>
          <span className="text-xs text-slate-500">{cases.length} total records</span>
        </div>

        {cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No complaints found for this institution.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase font-medium tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4">Case Ref</th>
                  <th scope="col" className="py-3 px-3">Bureau</th>
                  <th scope="col" className="py-3 px-3">Category</th>
                  <th scope="col" className="py-3 px-3">Status</th>
                  <th scope="col" className="py-3 px-3">Received</th>
                  <th scope="col" className="py-3 px-3">Closed</th>
                  <th scope="col" className="py-3 px-3">SLA Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-blue-400 group-hover:text-blue-300">
                      <Link to={`/cases/${c.id}`} className="hover:underline">
                        {c.case_ref}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700/60">
                        {c.bureau}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-medium">
                      {c.category}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {formatDate(c.received_date)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {c.closed_date ? formatDate(c.closed_date) : '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <SlaBadge
                        daysRemaining={
                          c.closed_date
                            ? null
                            : Math.round(
                                (new Date(c.sla_due_date).getTime() - new Date().setHours(0,0,0,0)) /
                                  (1000 * 60 * 60 * 24)
                              )
                        }
                        closed={!!c.closed_date}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Overlap History (FD9) */}
      <div className="glass rounded-2xl p-5 border border-slate-800 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock size={16} className="text-blue-400" />
          Cross-Case Overlap History
        </h2>

        {overlaps.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 space-y-1">
            <p>No overlap links recorded for this institution.</p>
            <p className="text-[11px] text-slate-600">
              Inter-bureau overlap detection models will populate this history in Stage 6.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {overlaps.map((o) => (
              <div
                key={o.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-blue-400 font-medium">{o.a_ref}</span>
                  <span className="text-slate-500">↔</span>
                  <span className="font-mono text-blue-400 font-medium">{o.b_ref}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400">
                    {Math.round(o.probability * 100)}% match
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
