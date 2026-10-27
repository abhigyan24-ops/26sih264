import { useQuery } from '@tanstack/react-query'
import { loadPolicy, loadPolicyStatus, usePolicyChange } from '../api/privacy'
import type { Scope } from '../api/privacy'

export default function ModeBar({isAdmin}: {isAdmin: boolean}) {
  useQuery({queryKey: ['policy'], queryFn: loadPolicy, refetchInterval: 10_000})
  const status = useQuery({queryKey: ['policy-status'], queryFn: loadPolicyStatus, refetchInterval: 10_000})
  const update = usePolicyChange()
  if (status.isPending) return <span className="text-xs text-slate-400">Loading privacy policy…</span>
  if (status.isError) return <span role="alert" className="text-xs text-rose-300">Policy status unavailable</span>
  const modes = {global: status.data.global, ...status.data.capabilities}
  return <div className="flex flex-wrap items-center gap-2 text-[10px]" aria-label="Privacy modes">
    {(Object.keys(modes) as Scope[]).map(scope => <button key={scope} disabled={!isAdmin || update.isPending}
      onClick={() => update.change(scope, modes[scope] === 'online' ? 'offline' : 'online')}
      title={isAdmin ? `Toggle ${scope}` : 'Read-only privacy policy'}
      className={`rounded border px-2 py-1 ${modes[scope] === 'online' ? 'border-amber-500/40 text-amber-300' : 'border-emerald-500/30 text-emerald-300'}`}>
      {scope}: {modes[scope]}
    </button>)}
    {status.data.no_external_calls && <span className="text-emerald-300">No external calls</span>}
    {update.isError && <span role="alert" className="text-rose-300">Policy update failed; restored previous setting</span>}
  </div>
}
