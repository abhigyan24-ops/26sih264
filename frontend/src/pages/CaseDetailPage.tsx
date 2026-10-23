import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, Clock, AlertTriangle, Link2,
  ChevronRight, Loader2, Shield, Info
} from 'lucide-react'
import { getCase, decideOverlap } from '../lib/api'
import { useState } from 'react'

function StatusBadge({ s }: { s: string }) {
  const cls: Record<string,string> = {
    received:'badge-muted', registered:'badge-info', assigned:'badge-info',
    under_process:'bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-2 py-0.5 rounded-full',
    escalated:'badge-high', action_taken:'badge-success',
    disposed:'badge-muted', transferred:'badge-medium', reopened:'badge-medium',
  }
  return <span className={cls[s]||'badge-muted'}>{s.replace('_',' ')}</span>
}

function FeatureBar({ label, value, contribution }: { label: string; value: number; contribution: number }) {
  const pct = Math.min(100, Math.abs(contribution) * 200)
  const positive = contribution >= 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <div className="flex gap-3">
          <span className="text-slate-500 font-mono">{value.toFixed(2)}</span>
          <span className={positive ? 'text-emerald-400' : 'text-rose-400'} title="contribution to score">
            {positive ? '+' : ''}{contribution.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${positive ? 'bg-gradient-to-r from-blue-600 to-emerald-500' : 'bg-gradient-to-r from-rose-600 to-amber-500'}`}
          style={{ width: `${pct}%`, marginLeft: positive ? 0 : `${100-pct}%` }}
        />
      </div>
    </div>
  )
}

function OverlapCard({ o, caseId, onDecide }: { o: any; caseId: number; onDecide: () => void }) {
  const [form, setForm] = useState({ decision: '', lead: '', reason: '', hold: false })
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()
  const decide = useMutation({
    mutationFn: () => decideOverlap(o.id, { decision: form.decision, lead_bureau: form.lead || undefined, hold_other: form.hold, reason: form.reason || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case', caseId] }); onDecide() }
  })

  const breakdown: Record<string, { value: number; contribution: number }> = o.breakdown || {}
  const levelCls = o.level === 'high' ? 'alert-high' : o.level === 'medium' ? 'border border-amber-500/20 bg-amber-500/5' : 'border border-slate-700/50 bg-slate-800/20'

  return (
    <div className={`rounded-xl p-4 ${levelCls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={o.level === 'high' ? 'badge-high' : o.level === 'medium' ? 'badge-medium' : 'badge-info'}>
            {o.level}
          </span>
          <span className="text-xs text-slate-400 font-mono">P={o.probability?.toFixed(3)}</span>
          {o.status !== 'suggested' && (
            <span className={o.status === 'confirmed' ? 'badge-success' : 'badge-muted'}>{o.status}</span>
          )}
        </div>
        <Link to={`/cases/${o.other_case_id}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
          CASE-{String(o.other_case_id).padStart(6,'0')} <ChevronRight size={12} />
        </Link>
      </div>

      {/* Explanation */}
      <p className="text-sm text-slate-300 mt-2 leading-relaxed">{o.explanation}</p>
      <div className="text-xs text-slate-600 mt-1">Source: {o.explanation_src} · Model: {o.model_version}</div>

      {/* Feature breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <div className="mt-3">
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
            Feature breakdown {expanded ? '▲' : '▼'}
          </button>
          {expanded && (
            <div className="mt-3 space-y-2 animate-slide-up">
              {Object.entries(breakdown).map(([feat, d]) => (
                <FeatureBar key={feat} label={feat} value={d.value} contribution={d.contribution} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decision actions */}
      {o.status === 'suggested' && (
        <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, decision: 'link' }))}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${form.decision === 'link' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
            >
              Link Cases
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, decision: 'dismiss' }))}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${form.decision === 'dismiss' ? 'border-rose-500/50 bg-rose-500/10 text-rose-300' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
            >
              Dismiss
            </button>
          </div>
          {form.decision === 'link' && (
            <div className="space-y-2 animate-slide-up">
              <input className="input text-xs" placeholder="Lead bureau code (e.g. RB)" value={form.lead} onChange={e => setForm(f => ({ ...f, lead: e.target.value }))} />
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={form.hold} onChange={e => setForm(f => ({ ...f, hold: e.target.checked }))} className="accent-blue-500" />
                Set hold_parallel on secondary bureau's case
              </label>
            </div>
          )}
          {form.decision && (
            <div className="animate-slide-up space-y-2">
              <input
                className="input text-xs"
                placeholder={form.decision === 'dismiss' ? 'Reason for dismissal (required)' : 'Remarks (optional)'}
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                required={form.decision === 'dismiss'}
              />
              <button
                onClick={() => decide.mutate()}
                disabled={decide.isPending || (form.decision === 'dismiss' && !form.reason)}
                className="btn-primary text-xs flex items-center gap-1.5 py-1.5"
              >
                {decide.isPending && <Loader2 size={12} className="animate-spin" />}
                Confirm {form.decision}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['case', Number(id)],
    queryFn: () => getCase(Number(id)),
  })
  const qc = useQueryClient()

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={28} className="animate-spin text-blue-500" />
    </div>
  )

  const { case: c, actions = [], overlaps = [], active_siblings = [] } = data || {}

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <Link to="/cases" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-3">
          <ArrowLeft size={15} /> Back to Cases
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono">{c?.case_ref}</h1>
              <StatusBadge s={c?.status} />
              {c?.sensitivity_flag && <span className="badge-high flex items-center gap-1"><Shield size={10} /> Sensitive</span>}
              {c?.hold_parallel && <span className="badge-medium">On Hold</span>}
            </div>
            <div className="text-sm text-slate-400 mt-1">{c?.category} · {c?.bureau} · Priority: <span className={c?.priority === 'high' ? 'text-rose-400' : 'text-slate-400'}>{c?.priority}</span></div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Received: <span className="font-mono">{c?.received_date}</span></div>
            <div>SLA Due: <span className={`font-mono ${c?.closed_date ? 'text-slate-600' : 'text-amber-400'}`}>{c?.sla_due_date}</span></div>
            {c?.inst_match_conf < 1 && (
              <div className="text-amber-500 mt-1 flex items-center gap-1 justify-end">
                <Info size={10} /> Match conf: {(c.inst_match_conf * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active siblings banner */}
      {active_siblings.length > 0 && (
        <div className="glass border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-3 animate-fade-in">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-amber-300">Pre-Action Notice</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {active_siblings.length} other active case{active_siblings.length>1?'s':''} at this institution:&nbsp;
              {active_siblings.map((s: any, i: number) => (
                <span key={s.id}>
                  <Link to={`/cases/${s.id}`} className="text-blue-400 hover:text-blue-300">{s.case_ref}</Link>
                  <span className="text-slate-600"> ({s.bureau})</span>
                  {i < active_siblings.length-1 ? ', ' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Description + Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold mb-3 text-slate-300">Complaint Description</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{c?.description}</p>
          </div>

          {/* Institution */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold mb-3 text-slate-300 flex items-center gap-2">
              <Building2 size={14} /> Institution
            </h2>
            <Link to={`/institutions/${c?.institution_id}`} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              {c?.institution}
            </Link>
            <div className="text-xs text-slate-500 mt-0.5">{c?.city} · {c?.region} · {c?.aicte_permanent_id}</div>
          </div>

          {/* Timeline */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
              <Clock size={14} /> Action Timeline
            </h2>
            <div className="space-y-4">
              {(actions as any[]).map((a, i) => (
                <div key={a.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    {i < actions.length - 1 && <div className="w-px flex-1 bg-slate-800 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-300 capitalize">{a.action_type.replace('_',' ')}</span>
                      {a.bureau && <span className="text-xs text-slate-600 font-mono">{a.bureau}</span>}
                    </div>
                    {a.remarks && <p className="text-xs text-slate-500 mt-0.5">{a.remarks}</p>}
                    <div className="text-xs text-slate-700 mt-0.5 font-mono">{a.created_at?.split('T')[0]} · {a.officer}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Overlaps */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
              <Link2 size={14} /> Overlap Links
              {overlaps.filter((o: any) => o.level === 'high' && o.status === 'suggested').length > 0 && (
                <span className="badge-high animate-pulse-slow ml-1">Action Required</span>
              )}
            </h2>
            {overlaps.length === 0 ? (
              <div className="card p-4 text-sm text-slate-500 text-center">No overlaps detected</div>
            ) : (
              <div className="space-y-3">
                {(overlaps as any[]).map((o: any) => (
                  <OverlapCard
                    key={o.id}
                    o={o}
                    caseId={Number(id)}
                    onDecide={() => qc.invalidateQueries({ queryKey: ['case', Number(id)] })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
