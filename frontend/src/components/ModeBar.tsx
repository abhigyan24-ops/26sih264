import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { loadPolicy, loadPolicyStatus, usePolicyChange } from '../api/privacy'
import type { Scope } from '../api/privacy'

export default function ModeBar({ isAdmin }: { isAdmin: boolean }) {
  useQuery({ queryKey: ['policy'], queryFn: loadPolicy, refetchInterval: 10_000 })
  const status = useQuery({
    queryKey: ['policy-status'],
    queryFn: loadPolicyStatus,
    refetchInterval: 10_000,
  })
  const update = usePolicyChange()

  if (status.isPending) {
    return <span className="text-[11px] font-mono text-slate-500">Checking policy...</span>
  }
  if (status.isError || !status.data) {
    return <span role="alert" className="chip chip-danger font-mono text-[10px]">Policy unavailable</span>
  }

  const modes = { global: status.data?.global ?? 'offline', ...(status.data?.capabilities ?? {}) }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono" aria-label="Privacy mode policy">
      {(Object.keys(modes) as Scope[]).map((scope) => {
        const isOnline = modes[scope] === 'online'
        return (
          <button
            key={scope}
            disabled={!isAdmin || update.isPending}
            onClick={() => update.change(scope, isOnline ? 'offline' : 'online')}
            title={isAdmin ? `Click to switch ${scope} mode` : 'Read-only mode (Admin required to toggle)'}
            className={`chip uppercase text-[10px] tracking-wide transition-colors ${
              isOnline
                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            } ${isAdmin ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
          >
            {scope}: {modes[scope]}
          </button>
        )
      })}

      {status.data.no_external_calls && (
        <span
          className="inline-flex items-center gap-1 chip chip-success uppercase text-[10px] tracking-wider"
          title="Air-gapped operation: all external telemetry and model calls disabled"
        >
          <ShieldCheck size={11} className="text-emerald-400" />
          Air-Gapped Local
        </span>
      )}

      {update.isError && (
        <span role="alert" className="chip chip-danger text-[10px]">
          Policy update reverted
        </span>
      )}
    </div>
  )
}
