import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Link2, XCircle, ExternalLink } from 'lucide-react'
import type { Overlap } from '../../api/overlaps'
import DecisionDialog from './DecisionDialog'

function highlightDifferences(textA: string, textB: string) {
  // Simple word-level difference highlighting for operational comparison
  const wordsA = new Set(textA.toLowerCase().split(/\s+/))
  const wordsB = new Set(textB.toLowerCase().split(/\s+/))

  const renderHighlighted = (text: string, otherWords: Set<string>) => {
    return text.split(/(\s+)/).map((segment, idx) => {
      const clean = segment.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (clean && !otherWords.has(clean)) {
        return (
          <span key={idx} className="bg-amber-500/20 text-amber-200 px-0.5 rounded font-medium">
            {segment}
          </span>
        )
      }
      return segment
    })
  }

  return {
    highlightedA: renderHighlighted(textA, wordsB),
    highlightedB: renderHighlighted(textB, wordsA),
  }
}

export default function OverlapCard({
  overlap: o,
  notify,
}: {
  overlap: Overlap
  notify: (message: string) => void
}) {
  const [decision, setDecision] = useState<'link' | 'dismiss' | null>(null)
  const breakdown = Object.entries(o.breakdown ?? {})
  const max = Math.max(0.01, ...breakdown.map(([, feature]) => Math.abs(feature.contribution)))

  const levelStyles: Record<string, { badge: string; label: string }> = {
    high: { badge: 'bg-rose-950/80 text-rose-300 border-rose-700', label: 'HIGH CONFIDENCE OVERLAP' },
    medium: { badge: 'bg-amber-950/80 text-amber-300 border-amber-700', label: 'MEDIUM OVERLAP' },
    info: { badge: 'bg-blue-950/80 text-blue-300 border-blue-700', label: 'INFORMATIONAL SIMILARITY' },
  }

  const currentLevel = levelStyles[o.level] || levelStyles.info
  const { highlightedA, highlightedB } = highlightDifferences(o.a_desc || '', o.b_desc || '')

  return (
    <article
      id={`overlap-${o.id}`}
      className="panel bg-slate-900/90 border border-slate-800 rounded p-5 space-y-4 text-slate-100"
    >
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-bold tracking-wider ${currentLevel.badge}`}>
              {currentLevel.label}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ID #{o.id}
            </span>
          </div>
          <h2 className="text-base font-semibold text-slate-100 mt-1.5 flex items-center gap-2">
            {o.institution}
          </h2>
        </div>

        {/* Confidence Percentage Metric */}
        <div className="text-left sm:text-right shrink-0">
          <div className="text-2xl font-bold font-mono text-blue-400 tabular-nums leading-none">
            {Math.round(o.probability * 100)}%
          </div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono mt-0.5">
            Statistical Confidence
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Case Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Case A */}
        <div className="bg-slate-950 border border-slate-800/90 rounded p-3.5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                Anchor Case
              </span>
              <Link
                to={`/cases/${o.a_id}`}
                className="text-xs font-mono font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {o.a_ref}
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </Link>
            </div>
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              {o.a_bureau}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Category: <strong className="text-slate-200">{o.a_cat}</strong>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-900">
            {highlightedA}
          </p>
        </div>

        {/* Case B */}
        <div className="bg-slate-950 border border-slate-800/90 rounded p-3.5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                Candidate Case
              </span>
              <Link
                to={`/cases/${o.b_id}`}
                className="text-xs font-mono font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {o.b_ref}
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </Link>
            </div>
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              {o.b_bureau}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Category: <strong className="text-slate-200">{o.b_cat}</strong>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-900">
            {highlightedB}
          </p>
        </div>
      </div>

      {/* Model Natural Language Explanation */}
      <div className="bg-slate-950/70 border border-slate-800/70 rounded p-3 text-xs space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="font-semibold text-slate-300">Model Assessment:</span>
          <span className="font-mono text-[11px] text-slate-500">
            Engine: {o.explanation_src === 'llm' ? 'LLM (Redacted Local Stub)' : 'Template Rule Engine'}
          </span>
        </div>
        <p className="text-slate-300 leading-normal">
          {o.explanation ?? 'No explanation text provided.'}
        </p>
      </div>

      {/* Feature Contribution Breakdown (collapsible) */}
      <details className="text-xs border border-slate-800/80 rounded bg-slate-950/50 p-2.5">
        <summary className="cursor-pointer font-medium text-slate-300 hover:text-white flex items-center justify-between">
          <span>Feature contribution explanation (not direct probability)</span>
          <span className="text-[10px] text-slate-500 font-mono">
            {breakdown.length} features analyzed
          </span>
        </summary>
        {breakdown.length === 0 ? (
          <p className="text-slate-500 mt-2 italic">
            No statistical breakdown parameters available for this model version.
          </p>
        ) : (
          <div className="space-y-1.5 mt-3 pt-2 border-t border-slate-800">
            {breakdown.map(([name, feature]) => (
              <div key={name} className="flex items-center gap-3 font-mono text-[11px]">
                <span className="w-36 text-slate-400 truncate" title={name}>
                  {name}
                </span>
                <div className="flex-1 bg-slate-900 h-2 rounded overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${
                      feature.contribution >= 0 ? 'bg-blue-500' : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (Math.abs(feature.contribution) / max) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-16 text-right tabular-nums text-slate-300 font-bold">
                  {feature.contribution > 0 ? '+' : ''}
                  {feature.contribution.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </details>

      {/* Decision Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded border capitalize ${
              o.status === 'confirmed'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : o.status === 'dismissed'
                ? 'bg-slate-900 text-slate-400 border-slate-700'
                : 'bg-amber-950/80 text-amber-300 border-amber-800'
            }`}
          >
            {o.status}
            {o.decision_reason ? ` — ${o.decision_reason}` : ''}
          </span>
        </div>

        {o.status === 'suggested' && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDecision('link')}
              className="btn-primary"
              title="Link cases and designate the lead coordinating bureau"
            >
              <Link2 className="w-3.5 h-3.5" />
              Link Cases
            </button>
            <button
              onClick={() => setDecision('dismiss')}
              className="btn-secondary"
              title="Mark as separate grievance issues"
            >
              <XCircle className="w-3.5 h-3.5" />
              Dismiss as Non-Overlap
            </button>
          </div>
        )}
      </div>

      {decision && (
        <DecisionDialog
          overlap={o}
          decision={decision}
          close={() => setDecision(null)}
          notify={notify}
        />
      )}
    </article>
  )
}
