import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Loader2, ChevronRight } from 'lucide-react'
import { getOverlaps, decideOverlap } from '../lib/api'

function FeatureBar({ label, contribution }: { label: string; value?: number; contribution: number }) {
  const pct = Math.min(100, Math.abs(contribution) * 200)
  const pos = contribution >= 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={pos ? 'text-emerald-400' : 'text-rose-400'}>{pos ? '+' : ''}{contribution.toFixed(2)}</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${pos ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function OverlapCard({ o }: { o: any }) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({ decision: '', lead: '', reason: '', hold: false })
  const qc = useQueryClient()
  const decide = useMutation({
    mutationFn: () => decideOverlap(o.id, {
      decision: form.decision,
      lead_bureau: form.lead || undefined,
      hold_other: form.hold,
      reason: form.reason || undefined,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overlaps'] })
  })

  const bd: Record<string, { value: number; contribution: number }> = o.breakdown || {}
  const levelCls = o.level === 'high'
    ? 'alert-high'
    : 'border border-amber-500/20 bg-amber-500/5 rounded-xl'

  return (
    <div className={`${levelCls} rounded-xl p-5`}>
      {/* Header row */}
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={o.level === 'high' ? 'badge-high' : 'badge-medium'}>{o.level}</span>
            <span className="text-xs text-slate-400">P = {o.probability?.toFixed(3)}</span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400">{o.institution}</span>
          </div>
          <div className="text-sm font-medium text-slate-200">
            <Link to={`/cases/${o.a_id}`} className="text-blue-400 hover:text-blue-300 font-mono">{o.a_ref}</Link>
            <span className="text-slate-600 mx-2">↔</span>
            <Link to={`/cases/${o.b_id}`} className="text-blue-400 hover:text-blue-300 font-mono">{o.b_ref}</Link>
          </div>
          <div className="text-xs text-slate-500">
            <span className="font-mono">{o.a_bureau}</span> ({o.a_cat}) ↔ <span className="font-mono">{o.b_bureau}</span> ({o.b_cat})
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/cases/${o.a_id}`} className="btn-secondary text-xs flex items-center gap-1 py-1.5">Case A <ChevronRight size={12} /></Link>
          <Link to={`/cases/${o.b_id}`} className="btn-secondary text-xs flex items-center gap-1 py-1.5">Case B <ChevronRight size={12} /></Link>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-sm text-slate-300 mt-3 leading-relaxed">{o.explanation}</p>

      {/* Feature breakdown expandable */}
      {Object.keys(bd).length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {expanded ? '▲ Hide' : '▼ Show'} feature breakdown
          </button>
          {expanded && (
            <div className="mt-3 space-y-2 animate-slide-up">
              {Object.entries(bd).map(([feat, d]) => (
                <FeatureBar key={feat} label={feat} value={d.value} contribution={d.contribution} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decision */}
      {o.status === 'suggested' && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {['link','dismiss'].map(d => (
              <button key={d}
                onClick={() => setForm(f => ({ ...f, decision: d }))}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  form.decision === d
                    ? d === 'link' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-400'
                }`}
              >
                {d === 'link' ? 'Link Cases' : 'Dismiss'}
              </button>
            ))}
          </div>
          {form.decision === 'link' && (
            <div className="flex gap-2 animate-slide-up">
              <input className="input text-xs" placeholder="Lead bureau (e.g. RB)" value={form.lead} onChange={e => setForm(f => ({ ...f, lead: e.target.value }))} />
              <label className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap cursor-pointer">
                <input type="checkbox" checked={form.hold} onChange={e => setForm(f => ({ ...f, hold: e.target.checked }))} className="accent-blue-500" />
                Hold secondary
              </label>
            </div>
          )}
          {form.decision && (
            <div className="flex gap-2 animate-slide-up">
              <input className="input text-xs flex-1"
                placeholder={form.decision === 'dismiss' ? 'Reason for dismissal (required)' : 'Remarks (optional)'}
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              />
              <button
                onClick={() => decide.mutate()}
                disabled={decide.isPending || (form.decision === 'dismiss' && !form.reason)}
                className="btn-primary text-xs whitespace-nowrap flex items-center gap-1"
              >
                {decide.isPending && <Loader2 size={12} className="animate-spin" />}
                Confirm
              </button>
            </div>
          )}
          {decide.isError && (
            <div className="text-xs text-rose-400">{(decide.error as any)?.response?.data?.detail}</div>
          )}
        </div>
      )}
      {o.status !== 'suggested' && (
        <div className="mt-3 text-xs text-slate-500">
          {o.status === 'confirmed' ? '✓ Linked' : '✗ Dismissed'} — {o.decision_reason}
        </div>
      )}
    </div>
  )
}

export default function OverlapsPage() {
  const [status, setStatus] = useState('suggested')
  const [level, setLevel] = useState('')

  const { data: overlaps = [], isLoading } = useQuery({
    queryKey: ['overlaps', status, level],
    queryFn: () => getOverlaps(status, level || undefined),
  })

  const high = (overlaps as any[]).filter(o => o.level === 'high')
  const med  = (overlaps as any[]).filter(o => o.level === 'medium')

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Overlap Detection</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cross-bureau complaint overlap analysis</p>
        </div>
        <div className="flex gap-2">
          {['suggested','confirmed','dismissed'].map(s => (
            <button key={s}
              onClick={() => setStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${status === s ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
            >
              {s}
            </button>
          ))}
          <select className="select text-xs w-28" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">All levels</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      {status === 'suggested' && (
        <div className="flex gap-4">
          <div className="glass rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse-slow" />
            <span className="text-sm"><span className="font-bold text-rose-400">{high.length}</span> High — Coordination Required</span>
          </div>
          <div className="glass rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm"><span className="font-bold text-amber-400">{med.length}</span> Medium</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
      ) : (overlaps as any[]).length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No {status} overlaps found</div>
      ) : (
        <div className="space-y-4">
          {high.length > 0 && status === 'suggested' && (
            <div>
              <h2 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse-slow inline-block" />
                High Priority — Potential Overlapping Cases – Coordination Required
              </h2>
              <div className="space-y-3">{high.map((o: any) => <OverlapCard key={o.id} o={o} />)}</div>
            </div>
          )}
          {med.length > 0 && status === 'suggested' && (
            <div>
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Medium Priority — Related Cases</h2>
              <div className="space-y-3">{med.map((o: any) => <OverlapCard key={o.id} o={o} />)}</div>
            </div>
          )}
          {(status !== 'suggested') && (overlaps as any[]).map((o: any) => <OverlapCard key={o.id} o={o} />)}
        </div>
      )}
    </div>
  )
}
