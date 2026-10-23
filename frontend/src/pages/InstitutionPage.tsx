import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Building2, Link2, AlertTriangle } from 'lucide-react'
import { getInstitution } from '../lib/api'

export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['institution', Number(id)],
    queryFn: () => getInstitution(Number(id)),
  })

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-blue-500" /></div>

  const { institution: inst, cases = [], repeat_categories = [], aliases = [], overlaps = [] } = data || {}

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <Link to="/cases" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft size={15} /> Back
      </Link>

      {/* Institution header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10">
            <Building2 size={24} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{inst?.name}</h1>
            <div className="text-sm text-slate-400 mt-1">{inst?.address}</div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
              <span>AICTE ID: <code className="font-mono text-slate-300">{inst?.aicte_permanent_id}</code></span>
              <span>Region: <span className="text-slate-300">{inst?.region}</span></span>
              <span>Type: <span className="text-slate-300">{inst?.inst_type}</span></span>
            </div>
            {aliases.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(aliases as any[]).map((a: any) => (
                  <span key={a.alias} className={`text-xs px-2 py-0.5 rounded-full border ${a.approved ? 'border-emerald-600/30 text-emerald-400' : 'border-slate-700 text-slate-500'}`}>
                    {a.alias}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{cases.length}</div>
            <div className="text-xs text-slate-500">Total cases</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cases table */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold">All Complaint Cases (All Bureaus)</h2>
            {repeat_categories.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <AlertTriangle size={12} />
                Repeat categories: {(repeat_categories as any[]).map((r: any) => `${r.category}(${r.n})`).join(', ')}
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-2.5 text-left">Case Ref</th>
                  <th className="px-4 py-2.5 text-left">Bureau</th>
                  <th className="px-4 py-2.5 text-left">Category</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Received</th>
                </tr>
              </thead>
              <tbody>
                {(cases as any[]).map((c: any) => (
                  <tr key={c.id} className="table-row">
                    <td className="px-4 py-2.5">
                      <Link to={`/cases/${c.id}`} className="font-mono text-blue-400 hover:text-blue-300 text-xs">{c.case_ref}</Link>
                      {c.overdue && <span className="ml-2 text-rose-500 text-xs">⚠ Overdue</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{c.bureau}</td>
                    <td className="px-4 py-2.5 text-xs"><span className="text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">{c.category}</span></td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-slate-400">{c.status.replace('_',' ')}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs font-mono">{c.received_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Overlap summary */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Link2 size={14} /> Cross-Bureau Overlaps
            </h2>
            {overlaps.length === 0 ? (
              <div className="text-sm text-slate-500">None detected</div>
            ) : (
              <div className="space-y-2">
                {(overlaps as any[]).slice(0, 5).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-blue-400">{o.a_ref}</span>
                      <span className="text-slate-600 mx-1">↔</span>
                      <span className="font-mono text-blue-400">{o.b_ref}</span>
                    </div>
                    <span className={o.level === 'high' ? 'badge-high' : 'badge-medium'}>{o.level}</span>
                  </div>
                ))}
                {overlaps.length > 5 && (
                  <div className="text-xs text-slate-600">+{overlaps.length - 5} more</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
