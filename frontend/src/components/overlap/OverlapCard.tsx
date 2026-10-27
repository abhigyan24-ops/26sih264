import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Overlap } from '../../api/overlaps'
import DecisionDialog from './DecisionDialog'

export default function OverlapCard({overlap: o, notify}: {overlap: Overlap; notify: (message: string) => void}) {
  const [decision, setDecision] = useState<'link' | 'dismiss' | null>(null)
  const breakdown = Object.entries(o.breakdown ?? {})
  const max = Math.max(0.01, ...breakdown.map(([,feature]) => Math.abs(feature.contribution)))
  return <article id={`overlap-${o.id}`} className="card p-5 space-y-4">
    <div className="flex justify-between gap-4"><div><span className="badge-info capitalize">{o.level}</span><h2 className="font-semibold mt-2">{o.institution}</h2>{o.level === 'high' && <p className="text-xs text-rose-300">Potential Overlapping Cases – Coordination Required</p>}</div><strong className="text-xl">{Math.round(o.probability * 100)}%</strong></div>
    <div className="grid md:grid-cols-2 gap-3">
      <div className="bg-slate-900 rounded p-3 text-sm"><Link to={`/cases/${o.a_id}`} className="text-blue-300">{o.a_ref}</Link> · {o.a_bureau} · {o.a_cat}<p className="text-slate-400 mt-2">{o.a_desc}</p></div>
      <div className="bg-slate-900 rounded p-3 text-sm"><Link to={`/cases/${o.b_id}`} className="text-blue-300">{o.b_ref}</Link> · {o.b_bureau} · {o.b_cat}<p className="text-slate-400 mt-2">{o.b_desc}</p></div>
    </div>
    <p className="text-sm text-slate-300">{o.explanation ?? 'No explanation available.'} <span className="text-xs text-slate-500">Source: {o.explanation_src}</span></p>
    <details><summary className="text-sm cursor-pointer">Explanation (not the probability itself)</summary>
      {breakdown.length === 0 ? <p className="text-xs text-slate-400 mt-2">No feature breakdown is available for this model.</p> : <div className="space-y-2 mt-3">{breakdown.map(([name, feature]) => <div key={name} className="flex gap-3 items-center text-xs"><span className="w-28">{name}</span><div className="flex-1 bg-slate-800 h-2 rounded"><div className={`h-2 rounded ${feature.contribution >= 0 ? 'bg-blue-500' : 'bg-rose-400'}`} style={{width: `${Math.abs(feature.contribution) / max * 100}%`}} /></div><span className="w-16 text-right">{feature.contribution.toFixed(2)}</span></div>)}</div>}
    </details>
    <div className="flex flex-wrap gap-3 items-center"><span className="text-xs capitalize text-slate-400">{o.status}{o.decision_reason ? `: ${o.decision_reason}` : ''}</span>
      {o.status === 'suggested' && <><button className="btn-primary" onClick={() => setDecision('link')}>Link</button><button className="btn-secondary" onClick={() => setDecision('dismiss')}>Not related</button></>}
    </div>
    {decision && <DecisionDialog overlap={o} decision={decision} close={() => setDecision(null)} notify={notify} />}
  </article>
}
