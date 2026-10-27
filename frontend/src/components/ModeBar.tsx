import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, AlertCircle } from 'lucide-react'
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
    return <span className="text-[11px] font-mono text-[#5B6068]">Checking policy...</span>
  }
  if (status.isError || !status.data) {
    return (
      <span role="alert" className="inline-flex items-center gap-1 font-mono text-[10px] bg-[#FDECEA] text-[#B42318] border border-[#F8B7B2] px-2 py-0.5 rounded-[4px]">
        <AlertCircle className="w-3 h-3" />
        Policy unavailable
      </span>
    )
  }

  const modes = { global: status.data.global, ...status.data.capabilities }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono" aria-label="Privacy mode policy">
      {(Object.keys(modes) as Scope[]).map((scope) => {
        const isOnline = modes[scope] === 'online'
        return (
          <button
            key={scope}
            type="button"
            disabled={!isAdmin || update.isPending}
            onClick={() => update.change(scope, isOnline ? 'offline' : 'online')}
            title={isAdmin ? `Click to switch ${scope} mode` : 'Read-only mode (Admin required to toggle)'}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[10px] font-mono font-medium tracking-wide transition-colors ${
              isOnline
                ? 'bg-[#FFF3E0] text-[#9A4A00] border-[#FCD299] hover:bg-[#FEE4E2]'
                : 'bg-[#E6F4EC] text-[#067647] border-[#A8E2C2] hover:bg-[#D1FADF]'
            } ${isAdmin ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-85'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#B42318]' : 'bg-[#067647]'}`} />
            <span>{scope}: {modes[scope]}</span>
          </button>
        )
      })}

      {status.data.no_external_calls && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border border-[#A8E2C2] bg-[#E6F4EC] text-[#067647] font-mono text-[10px] font-semibold tracking-wider uppercase"
          title="Air-gapped operation: all external telemetry and model calls disabled"
        >
          <ShieldCheck size={12} className="text-[#067647]" />
          Air-Gapped Local
        </span>
      )}

      {update.isError && (
        <span role="alert" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#FDECEA] text-[#B42318] border border-[#F8B7B2] text-[10px] font-mono">
          <AlertCircle size={11} />
          Policy update reverted
        </span>
      )}
    </div>
  )
}
