import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadModels, loadDisagreements, promoteModel, rollbackModel, metric } from '../../api/evaluation'
import type { PairError } from '../../api/evaluation'
import { me } from '../../lib/api'

function Errors({title, items}: {title: string; items: PairError[]}) {
  return <section className="card p-4 space-y-2"><h3 className="font-semibold">{title}</h3>{items.length === 0 ? <p className="text-sm text-slate-400">None at the Medium threshold.</p> : <table className="w-full text-sm"><thead><tr><th className="text-left">Case pair</th><th className="text-right">Probability</th></tr></thead><tbody>{items.map(row => <tr key={`${row.case_a}-${row.case_b}`}><td><Link className="text-blue-300 underline" to={`/cases/${row.case_a}`}>#{row.case_a}</Link> / <Link className="text-blue-300 underline" to={`/cases/${row.case_b}`}>#{row.case_b}</Link></td><td className="text-right font-mono">{metric(row.probability)}</td></tr>)}</tbody></table>}</section>
}

export default function EvaluationTab() {
  const [selectedId, setSelectedId] = useState('')
  const [offset, setOffset] = useState(0)
  const [message, setMessage] = useState('')
  const qc = useQueryClient()
  const user = useQuery({queryKey:['me'], queryFn:me})
  const models = useQuery({queryKey:['evaluation-models'], queryFn:loadModels})
  const hasShadow = models.data?.some(model => model.status === 'shadow') ?? false
  const disagreements = useQuery({queryKey:['shadow-disagreements',offset], queryFn:() => loadDisagreements(offset), enabled:hasShadow})
  const publication = useMutation({
    mutationFn:(action: {kind:'promote'; version:string} | {kind:'rollback'}) => action.kind === 'promote' ? promoteModel(action.version) : rollbackModel(),
    onSuccess:() => {
      setMessage('Model publication completed.')
      for (const key of ['evaluation-models','model-card','shadow-disagreements','models']) void qc.invalidateQueries({queryKey:[key]})
    },
    onError:() => setMessage('Model publication failed. Check that the model artifact is available, then retry.'),
  })
  if (models.isPending) return <p>Loading evaluation models…</p>
  if (models.isError) return <div role="alert">Evaluation data could not load. <button className="btn-secondary" onClick={() => void models.refetch()}>Retry</button></div>
  if (!models.data.length) return <p className="card p-5">No models registered. Train the synthetic overlap model first.</p>
  const selected = models.data.find(model => model.id === selectedId) ?? models.data.find(model => model.status === 'active') ?? models.data[0]
  const evaluation = selected.metrics.evaluation
  const isAdmin = user.data?.role === 'admin'
  return <div className="space-y-5">
    <p className="border border-amber-500/30 p-3 text-sm text-amber-300">Synthetic data · not real-world accuracy. Review calibration and errors before promoting.</p>
    <section className="card p-5 space-y-4">
      <label className="block text-sm">Model version <select className="select ml-2" value={selected.id} onChange={event => setSelectedId(event.target.value)}>{models.data.map(model => <option key={model.id} value={model.id}>{model.id} ({model.status})</option>)}</select></label>
      <p className="text-sm text-slate-400">{selected.trained_on} · {selected.status}</p>
      {isAdmin && <div className="flex gap-3"><button className="btn-primary" disabled={publication.isPending} onClick={() => {if (window.confirm(`Promote ${selected.id} as the active model?`)) publication.mutate({kind:'promote',version:selected.id})}}>Promote selected model</button><button className="btn-secondary" disabled={publication.isPending} onClick={() => {if (window.confirm('Roll back to the previous active model?')) publication.mutate({kind:'rollback'})}}>Roll back</button></div>}
      {message && <p role={publication.isError ? 'alert' : 'status'} className="text-sm">{message}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Model</th><th>Status</th><th>PR-AUC</th><th>High precision</th><th>Medium recall</th></tr></thead><tbody>{models.data.map(model => <tr key={model.id} className="border-t border-slate-800"><td className="py-2 font-mono">{model.id}</td><td className="text-center">{model.status}</td><td className="text-center">{metric(model.metrics.evaluation?.pr_auc ?? model.metrics.pr_auc_test)}</td><td className="text-center">{metric((model.metrics.evaluation?.high ?? model.metrics.high)?.precision)}</td><td className="text-center">{metric((model.metrics.evaluation?.medium ?? model.metrics.medium)?.recall)}</td></tr>)}</tbody></table></div>
    </section>
    {!evaluation ? <p className="card p-4 text-sm">Full evaluation is unavailable for this version. Run <code>python -m ml.evaluate</code> when it is active to generate calibration and error lists.</p> : <>
      <section className="card p-5 space-y-3"><h2 className="font-semibold">Baseline comparison</h2><p className="text-sm">Alerts per active case: {metric(evaluation.alerts_per_active_case)}</p><table className="w-full text-sm"><thead><tr><th className="text-left">Score</th><th>Threshold</th><th>Precision</th><th>Recall</th><th>PR-AUC</th></tr></thead><tbody>{[{name:'High',score:evaluation.high},{name:'Medium',score:evaluation.medium},{name:'Cosine baseline',score:evaluation.baseline}].map(row => <tr key={row.name} className="border-t border-slate-800"><td className="py-2">{row.name}</td><td className="text-center">{metric(row.score.threshold)}</td><td className="text-center">{metric(row.score.precision)}</td><td className="text-center">{metric(row.score.recall)}</td><td className="text-center">{metric(row.name === 'Cosine baseline' ? evaluation.baseline.pr_auc : evaluation.pr_auc)}</td></tr>)}</tbody></table></section>
      <section className="card p-5 space-y-3"><h2 className="font-semibold">Calibration</h2><table className="w-full text-sm"><thead><tr><th>Mean predicted probability</th><th>Observed positive fraction</th></tr></thead><tbody>{evaluation.calibration.map((row,index) => <tr key={index} className="border-t border-slate-800"><td className="text-center py-2">{metric(row.mean_predicted)}</td><td className="text-center">{metric(row.observed)}</td></tr>)}</tbody></table></section>
      <div className="grid md:grid-cols-2 gap-4"><Errors title="Worst false positives" items={evaluation.false_positives} /><Errors title="Worst false negatives" items={evaluation.false_negatives} /></div>
    </>}
    <section className="card p-5 space-y-3"><h2 className="font-semibold">Shadow disagreements</h2>
      {!hasShadow ? <p>No shadow model.</p> : disagreements.isPending ? <p>Loading shadow comparisons…</p> : disagreements.isError ? <p role="alert">Shadow comparisons could not load.</p> : <>
        <p className="text-sm text-slate-400">{disagreements.data.coverage}</p><p className="text-sm">{disagreements.data.total} disagreements · estimated extra alerts/day: {metric(disagreements.data.extra_alerts_per_day_estimate)}</p>
        {disagreements.data.items.length === 0 ? <p className="text-sm">No observed disagreements yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Cases</th><th>Active</th><th>Shadow</th></tr></thead><tbody>{disagreements.data.items.map(row => <tr key={`${row.model_version}-${row.case_a}-${row.case_b}`} className="border-t border-slate-800"><td className="py-2">{row.a_ref} / {row.b_ref}</td><td className="text-center">{row.active_level} ({metric(row.active_probability)})</td><td className="text-center">{row.shadow_level} ({metric(row.shadow_probability)})</td></tr>)}</tbody></table></div>}
        <div className="flex gap-3"><button className="btn-secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0,offset-20))}>Previous</button><button className="btn-secondary" disabled={offset+20>=disagreements.data.total} onClick={() => setOffset(offset+20)}>Next</button></div>
      </>}
    </section>
  </div>
}
