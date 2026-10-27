import { useQuery } from '@tanstack/react-query'
import { loadModelCard } from '../../api/evaluation'

export default function ModelCardTab() {
  const card = useQuery({queryKey: ['model-card'], queryFn: loadModelCard})
  if (card.isPending) return <p>Loading model card…</p>
  if (card.isError) return <div role="alert">Model card could not load. <button className="btn-secondary" onClick={() => void card.refetch()}>Retry</button></div>
  if (!card.data.length) return <p className="card p-5">No parameters have been registered. Run the synthetic tuning/training scripts first.</p>
  const colors: Record<string,string> = {learned_synthetic: 'text-amber-300', default_pending_data: 'text-slate-400', policy: 'text-blue-300', learned: 'text-emerald-300'}
  return <section className="card p-5 space-y-4">
    <h2 className="font-semibold">Model card · all registry history</h2>
    <p className="text-sm text-amber-300">Synthetic prototype data. Learned values are not evidence of real-world performance.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Parameter', 'Value', 'Origin', 'Derivation', 'Model version', 'Metrics', 'Created'].map(label => <th key={label} className="p-2 text-left">{label}</th>)}</tr></thead><tbody>
      {card.data.map(row => <tr key={row.id} className="border-t border-slate-800 align-top"><td className="p-2 font-mono">{row.parameter}</td><td className="p-2 font-mono">{row.value}</td><td className={`p-2 ${colors[row.origin] ?? 'text-slate-300'}`}><span className="border rounded px-1">{row.origin}</span></td><td className="p-2 max-w-sm">{row.derived_from ?? '—'}</td><td className="p-2 font-mono">{row.model_version ?? '—'}</td><td className="p-2">{row.metrics ? <details><summary className="cursor-pointer">Inspect</summary><pre className="text-xs max-w-lg overflow-auto">{JSON.stringify(row.metrics,null,2)}</pre></details> : '—'}</td><td className="p-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td></tr>)}
    </tbody></table></div>
  </section>
}
