import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loadPolicy, loadLedger, usePolicyChange } from '../../api/privacy'
import type { Scope } from '../../api/privacy'
import { me } from '../../lib/api'

export default function PrivacyTab() {
  const [offset, setOffset] = useState(0)
  const user = useQuery({queryKey: ['me'], queryFn: me})
  const policy = useQuery({queryKey: ['policy'], queryFn: loadPolicy, refetchInterval: 10_000})
  const canRead = user.data?.role === 'admin' || user.data?.role === 'management'
  const ledger = useQuery({queryKey: ['egress', offset], queryFn: () => loadLedger(offset), enabled: canRead, refetchInterval: 10_000})
  const update = usePolicyChange()
  if (policy.isPending) return <p className="text-slate-400">Loading privacy policy…</p>
  if (policy.isError) return <p role="alert" className="text-rose-300">Could not load privacy policy.</p>
  const settings = policy.data.settings
  return <div className="space-y-5">
    <section className="card p-5 space-y-3">
      <h2 className="font-semibold">Privacy policy</h2>
      <p className="text-xs text-slate-400">Sensitive cases always stay offline. Online providers are prototype stubs.</p>
      <table className="w-full text-sm"><thead><tr><th className="text-left">Scope</th><th className="text-left">Setting</th><th className="text-left">Last changed</th><th>Action</th></tr></thead>
        <tbody>{(['global', 'email', 'explain', 'enrich'] as Scope[]).map(scope => {
          const row = settings.find(item => item.scope === scope)
          const mode = row?.value ?? settings.find(item => item.scope === 'global')?.value ?? 'offline'
          return <tr key={scope} className="border-t border-slate-800"><td className="py-3">{scope}</td><td>{row?.value ?? `Inherit (${mode})`}</td><td>{row ? new Date(row.changed_at).toLocaleString() : '—'}</td><td className="text-center">
            {user.data?.role === 'admin' ? <button className="btn-secondary text-xs" disabled={update.isPending} onClick={() => update.change(scope, mode === 'online' ? 'offline' : 'online')}>Switch to {mode === 'online' ? 'offline' : 'online'}</button> : 'Read only'}
          </td></tr>
        })}</tbody>
      </table>
      {update.isError && <p role="alert" className="text-rose-300 text-sm">Update failed. Previous settings restored.</p>}
    </section>
    {canRead && <section className="card p-5 space-y-3">
      <h2 className="font-semibold">Egress ledger</h2>
      {ledger.isPending ? <p>Loading ledger…</p> : ledger.isError ? <p role="alert" className="text-rose-300">Could not load ledger.</p> : ledger.data.data.length === 0 ? <p className="text-slate-400">No egress attempts recorded.</p> : <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr>{['Time', 'Capability', 'Destination', 'Payload', 'Mode', 'Outcome', 'Redacted'].map(label => <th key={label} className="text-left p-2">{label}</th>)}</tr></thead><tbody>
        {ledger.data.data.map(row => <tr key={row.id} className="border-t border-slate-800"><td className="p-2">{new Date(row.created_at).toLocaleString()}</td><td>{row.capability}</td><td>{row.destination}</td><td>{row.payload_kind}</td><td>{row.mode}</td><td>{row.outcome}</td><td>{row.redacted ? 'Yes' : 'No'}</td></tr>)}
      </tbody></table></div>}
      <div className="flex justify-between items-center text-xs"><button className="btn-secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous</button><span>{ledger.data?.total ?? 0} records</span><button className="btn-secondary" disabled={!ledger.data || offset + 20 >= ledger.data.total} onClick={() => setOffset(offset + 20)}>Next</button></div>
    </section>}
  </div>
}
