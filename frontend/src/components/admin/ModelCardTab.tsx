import { useQuery } from '@tanstack/react-query'
import { loadModelCard } from '../../api/evaluation'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function ModelCardTab() {
  const card = useQuery({ queryKey: ['model-card'], queryFn: loadModelCard })

  if (card.isPending) {
    return <p className="text-xs text-[#5B6068] font-mono p-4">Loading statutory model card…</p>
  }
  if (card.isError) {
    return (
      <div role="alert" className="p-4 bg-[#FDECEA] border border-[#F8B7B2] rounded-[6px] text-xs text-[#B42318] flex items-center justify-between">
        <span>Model card could not load from server.</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px]"
          onClick={() => void card.refetch()}
        >
          <RotateCcw className="w-3 h-3" />
          Retry
        </button>
      </div>
    )
  }
  if (!card.data.length) {
    return (
      <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-6 text-center text-xs text-[#5B6068]">
        No parameters have been registered. Run the synthetic tuning/training scripts first.
      </div>
    )
  }

  const originBadges: Record<string, { bg: string; text: string; border: string }> = {
    learned_synthetic: { bg: 'bg-[#FFF3E0]', text: 'text-[#9A4A00]', border: 'border-[#FCD299]' },
    default_pending_data: { bg: 'bg-[#EFEDE7]', text: 'text-[#5B6068]', border: 'border-[#DAD6CC]' },
    policy: { bg: 'bg-[#E8F0FE]', text: 'text-[#1F3A5F]', border: 'border-[#B2CCF8]' },
    learned: { bg: 'bg-[#E6F4EC]', text: 'text-[#067647]', border: 'border-[#A8E2C2]' },
  }

  return (
    <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-4">
      <div className="border-b border-[#DAD6CC] pb-3">
        <h2 className="text-sm font-semibold text-[#1B1F24] uppercase tracking-wide">
          Statutory Model Card · Parameter Lineage & Registry History
        </h2>
        <div className="mt-2 p-3 bg-[#FFF3E0] border border-[#FCD299] text-[#9A4A00] rounded-[4px] text-xs flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0 text-[#B54708]" />
          <span>
            <strong>Synthetic Prototype Artifact:</strong> Learned parameter values originate from synthetic cross-bureau corpus calibration and do not indicate real-world model deployment weights.
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-[#DAD6CC] text-[#5B6068] text-[11px] font-semibold uppercase tracking-wider bg-[#F6F5F1]">
              <th className="py-2.5 px-3">Parameter</th>
              <th className="py-2.5 px-3">Value</th>
              <th className="py-2.5 px-3">Origin</th>
              <th className="py-2.5 px-3">Derivation</th>
              <th className="py-2.5 px-3">Model Version</th>
              <th className="py-2.5 px-3">Metrics</th>
              <th className="py-2.5 px-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DAD6CC] align-top">
            {card.data.map((row) => {
              const badge = originBadges[row.origin] ?? {
                bg: 'bg-[#EFEDE7]',
                text: 'text-[#5B6068]',
                border: 'border-[#DAD6CC]',
              }

              return (
                <tr key={row.id} className="hover:bg-[#F6F5F1] transition-colors font-mono">
                  <td className="py-2.5 px-3 font-semibold text-[#1B1F24]">{row.parameter}</td>
                  <td className="py-2.5 px-3 text-[#1B1F24]">{row.value}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-[4px] border text-[10px] font-sans font-medium ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {row.origin}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 max-w-xs text-[#5B6068] font-sans truncate" title={row.derived_from ?? ''}>
                    {row.derived_from ?? '—'}
                  </td>
                  <td className="py-2.5 px-3 text-[#5B6068]">{row.model_version ?? '—'}</td>
                  <td className="py-2.5 px-3 font-sans">
                    {row.metrics ? (
                      <details className="text-xs group">
                        <summary className="cursor-pointer text-[#2a78d6] hover:underline font-medium select-none">
                          Inspect
                        </summary>
                        <pre className="text-[10px] bg-[#F6F5F1] border border-[#DAD6CC] p-2 rounded-[4px] max-w-xs overflow-auto mt-1 font-mono text-[#1B1F24]">
                          {JSON.stringify(row.metrics, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-[#5B6068] text-[11px]">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
