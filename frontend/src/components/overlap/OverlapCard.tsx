import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Link2, XCircle, ExternalLink, ChevronDown } from 'lucide-react'
import type { Overlap } from '../../api/overlaps'
import DecisionDialog from './DecisionDialog'
import { WordDiff, LevelBadge } from '../../ui'

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

  return (
    <article
      id={`overlap-${o.id}`}
      className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-4 shadow-xs"
    >
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#DAD6CC] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <LevelBadge level={o.level} probability={o.probability} />
            <span className="text-xs font-mono text-[#5B6068]">
              Link ID #{o.id}
            </span>
          </div>
          <h2 className="text-base font-semibold text-[#1B1F24] tracking-tight">
            {o.institution}
          </h2>
        </div>

        {/* Statistical Confidence Metric */}
        <div className="text-left sm:text-right shrink-0">
          <div className="text-2xl font-bold font-mono text-[#1F3A5F] tabular-nums leading-none">
            {Math.round(o.probability * 100)}%
          </div>
          <div className="text-[10px] text-[#5B6068] uppercase tracking-wider font-mono mt-1">
            Statistical Confidence
          </div>
        </div>
      </div>

      {/* Case Identity Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        <div className="flex items-center justify-between p-2 rounded-[4px] bg-[#EFEDE7] border border-[#DAD6CC]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-[#5B6068]">Anchor:</span>
            <Link
              to={`/cases/${o.a_id}`}
              className="font-bold text-[#1F3A5F] hover:underline flex items-center gap-1"
            >
              {o.a_ref}
              <ExternalLink className="w-3 h-3 text-[#5B6068]" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.2 rounded bg-[#FFFFFF] border border-[#DAD6CC] text-[#1B1F24]">
              {o.a_bureau}
            </span>
            <span className="text-[#5B6068] font-sans truncate max-w-[120px]">{o.a_cat}</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2 rounded-[4px] bg-[#EFEDE7] border border-[#DAD6CC]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-[#175CD3]">Candidate:</span>
            <Link
              to={`/cases/${o.b_id}`}
              className="font-bold text-[#1F3A5F] hover:underline flex items-center gap-1"
            >
              {o.b_ref}
              <ExternalLink className="w-3 h-3 text-[#5B6068]" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.2 rounded bg-[#FFFFFF] border border-[#DAD6CC] text-[#1B1F24]">
              {o.b_bureau}
            </span>
            <span className="text-[#5B6068] font-sans truncate max-w-[120px]">{o.b_cat}</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Case WordDiff Comparison (Projector-Ready min 16px body) */}
      <WordDiff
        textA={o.a_desc || ''}
        textB={o.b_desc || ''}
        labelA={`${o.a_ref} (${o.a_bureau})`}
        labelB={`${o.b_ref} (${o.b_bureau})`}
      />

      {/* Natural Language Explanation Assessment */}
      <div className="bg-[#F6F5F1] border border-[#DAD6CC] rounded-[4px] p-3.5 text-xs space-y-1">
        <div className="flex items-center justify-between text-[#5B6068] border-b border-[#DAD6CC]/60 pb-1.5 mb-1.5">
          <span className="font-semibold text-[#1B1F24]">Similarity Assessment:</span>
          <span className="font-mono text-[11px] text-[#5B6068]">
            Engine: {o.explanation_src === 'llm' ? 'Local LLM (Redacted Stub)' : 'Calibrated Classifier Engine'}
          </span>
        </div>
        <p className="text-[#1B1F24] leading-relaxed">
          {o.explanation ?? 'No automated assessment text generated.'}
        </p>
      </div>

      {/* Feature Contribution Breakdown (Collapsible) */}
      <details className="text-xs border border-[#DAD6CC] rounded-[4px] bg-[#FFFFFF] p-3 group">
        <summary className="cursor-pointer font-medium text-[#1B1F24] flex items-center justify-between select-none">
          <span className="flex items-center gap-1.5">
            <ChevronDown className="w-3.5 h-3.5 text-[#5B6068] group-open:rotate-180 transition-transform" />
            <span>Feature contribution explanation (independent of direct probability)</span>
          </span>
          <span className="text-[11px] text-[#5B6068] font-mono">
            {breakdown.length} features analyzed
          </span>
        </summary>
        {breakdown.length === 0 ? (
          <p className="text-[#5B6068] mt-2 italic">
            No statistical breakdown parameters available for this model version.
          </p>
        ) : (
          <div className="space-y-2 mt-3 pt-2 border-t border-[#DAD6CC]">
            {breakdown.map(([name, feature]) => (
              <div key={name} className="flex items-center gap-3 font-mono text-[11px]">
                <span className="w-40 text-[#5B6068] truncate" title={name}>
                  {name}
                </span>
                <div className="flex-1 bg-[#EFEDE7] h-2.5 rounded-[2px] overflow-hidden border border-[#DAD6CC]">
                  <div
                    className={`h-full ${
                      feature.contribution >= 0 ? 'bg-[#2a78d6]' : 'bg-[#B42318]'
                    }`}
                    style={{
                      width: `${Math.min(100, (Math.abs(feature.contribution) / max) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-16 text-right tabular-nums text-[#1B1F24] font-semibold">
                  {feature.contribution > 0 ? '+' : ''}
                  {feature.contribution.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </details>

      {/* Decision Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#DAD6CC]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5B6068] font-medium">Status:</span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-[4px] border capitalize ${
              o.status === 'confirmed'
                ? 'bg-[#E6F4EC] text-[#067647] border-[#A8E2C2]'
                : o.status === 'dismissed'
                ? 'bg-[#EFEDE7] text-[#5B6068] border-[#DAD6CC]'
                : 'bg-[#FFF3E0] text-[#9A4A00] border-[#FCD299]'
            }`}
          >
            {o.status}
            {o.decision_reason ? ` — ${o.decision_reason}` : ''}
          </span>
        </div>

        {o.status === 'suggested' && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDecision('link')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1F3A5F] hover:bg-[#17304F] rounded-[4px] shadow-sm transition-colors"
              title="Link cases and designate the lead coordinating bureau"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link Cases</span>
            </button>
            <button
              type="button"
              onClick={() => setDecision('dismiss')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#B42318] bg-[#FDECEA] hover:bg-[#F8B7B2] border border-[#F8B7B2] rounded-[4px] transition-colors"
              title="Mark as separate grievance issues"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Dismiss as Non-Overlap</span>
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
