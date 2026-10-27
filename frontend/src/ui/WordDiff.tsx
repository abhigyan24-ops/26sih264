import { computeWordDiff } from '../lib/wordDiff'
import { cn } from './utils'
import { AlertCircle } from 'lucide-react'

export interface WordDiffProps {
  textA: string
  textB: string
  labelA?: string
  labelB?: string
  className?: string
}

export function WordDiff({
  textA,
  textB,
  labelA = 'Anchor Filing Description',
  labelB = 'Overlapping Filing Description',
  className,
}: WordDiffProps) {
  const diff = computeWordDiff(textA, textB)

  return (
    <div className={cn('space-y-3', className)}>
      {diff.isTruncated && (
        <div className="flex items-center gap-2 p-2.5 rounded-[4px] bg-[#FFF3E0] border border-[#FCD299] text-[#9A4A00] text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{diff.truncationNote}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column A (Anchor) */}
        <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="text-xs font-mono font-semibold text-[#5B6068] uppercase tracking-wider mb-2 border-b border-[#EFEDE7] pb-1.5 flex items-center justify-between">
              <span>{labelA}</span>
              <span className="text-[10px] text-[#8C8A82]">Anchor</span>
            </div>
            {/* Projector-ready: min 16px body text */}
            <div className="text-base text-[#1B1F24] leading-relaxed whitespace-pre-wrap font-sans">
              {diff.tokensA.length === 0 ? (
                <span className="text-[#8C8A82] italic text-sm">No description provided.</span>
              ) : (
                diff.tokensA.map((t, idx) => {
                  if (t.type === 'removed') {
                    return (
                      <mark
                        key={idx}
                        className="bg-[#FFF3E0] text-[#9A4A00] border-b border-[#FCD299] px-0.5 rounded-[2px] not-italic font-medium"
                      >
                        {t.text}
                      </mark>
                    )
                  }
                  return <span key={idx}>{t.text}</span>
                })
              )}
            </div>
          </div>
        </div>

        {/* Column B (Candidate) */}
        <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="text-xs font-mono font-semibold text-[#5B6068] uppercase tracking-wider mb-2 border-b border-[#EFEDE7] pb-1.5 flex items-center justify-between">
              <span>{labelB}</span>
              <span className="text-[10px] text-[#175CD3]">Candidate</span>
            </div>
            {/* Projector-ready: min 16px body text */}
            <div className="text-base text-[#1B1F24] leading-relaxed whitespace-pre-wrap font-sans">
              {diff.tokensB.length === 0 ? (
                <span className="text-[#8C8A82] italic text-sm">No description provided.</span>
              ) : (
                diff.tokensB.map((t, idx) => {
                  if (t.type === 'added') {
                    return (
                      <mark
                        key={idx}
                        className="bg-[#E8F0FE] text-[#175CD3] border-b border-[#B8D5FA] px-0.5 rounded-[2px] not-italic font-medium"
                      >
                        {t.text}
                      </mark>
                    )
                  }
                  return <span key={idx}>{t.text}</span>
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Difference Legend */}
      <div className="flex items-center gap-4 text-xs font-mono text-[#5B6068] pt-1 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-[#FFF3E0] border border-[#FCD299] inline-block" />
          Unique to Anchor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-[#E8F0FE] border border-[#B8D5FA] inline-block" />
          Unique to Candidate
        </span>
        <span className="text-[11px] text-[#8C8A82] ml-auto hidden sm:inline">
          High-contrast word-level difference highlighting (WCAG 2.1)
        </span>
      </div>
    </div>
  )
}
