import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loadPolicy, loadLedger, usePolicyChange } from '../../api/privacy'
import type { Scope } from '../../api/privacy'
import { me } from '../../lib/api'
import { Shield, Lock, ChevronLeft, ChevronRight } from 'lucide-react'

export default function PrivacyTab() {
  const [offset, setOffset] = useState(0)
  const user = useQuery({ queryKey: ['me'], queryFn: me })
  const policy = useQuery({
    queryKey: ['policy'],
    queryFn: loadPolicy,
    refetchInterval: 10_000,
  })
  const canRead = user.data?.role === 'admin' || user.data?.role === 'management'
  const ledger = useQuery({
    queryKey: ['egress', offset],
    queryFn: () => loadLedger(offset),
    enabled: canRead,
    refetchInterval: 10_000,
  })
  const update = usePolicyChange()

  if (policy.isPending) {
    return <p className="text-xs text-slate-400 font-mono">Loading privacy policy…</p>
  }
  if (policy.isError) {
    return <p role="alert" className="chip chip-danger text-xs font-mono">Could not load privacy policy configuration.</p>
  }

  const settings = policy.data.settings

  return (
    <div className="space-y-6">
      {/* Policy Table Panel */}
      <section className="panel bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
        <div className="border-b border-slate-800 pb-2">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-2">
            <Shield size={16} className="text-blue-500" />
            Data Privacy & Egress Governance Policy
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict fail-closed enforcement: sensitive complaints are unconditionally air-gapped. External services operate via redacted local stubs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th className="text-left">Capability Scope</th>
                <th className="text-left">Configured Value</th>
                <th className="text-left">Effective Route</th>
                <th className="text-left">Last Modified</th>
                <th className="text-right">Policy Action</th>
              </tr>
            </thead>
            <tbody>
              {(['global', 'email', 'explain', 'enrich'] as Scope[]).map((scope) => {
                const row = settings.find((item) => item.scope === scope)
                const globalValue = settings.find((item) => item.scope === 'global')?.value ?? 'offline'
                const effective = row?.value ?? globalValue
                const isOnline = effective === 'online'

                return (
                  <tr key={scope} className="border-t border-slate-800/80">
                    <td className="py-2.5 font-mono font-bold text-slate-200 capitalize">
                      {scope}
                    </td>
                    <td className="py-2.5 font-mono text-slate-300">
                      {row?.value ? (
                        <span className={`chip ${isOnline ? 'chip-warning' : 'chip-success'}`}>
                          {row.value.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Inherited</span>
                      )}
                    </td>
                    <td className="py-2.5 font-mono">
                      <span className={`chip ${isOnline ? 'chip-warning' : 'chip-success'}`}>
                        {effective.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-400 text-[11px]">
                      {row ? new Date(row.changed_at).toLocaleString() : 'System Default'}
                    </td>
                    <td className="py-2.5 text-right">
                      {user.data?.role === 'admin' ? (
                        <button
                          className="btn-secondary text-[11px] py-1 px-2.5"
                          disabled={update.isPending}
                          onClick={() =>
                            update.change(scope, effective === 'online' ? 'offline' : 'online')
                          }
                        >
                          Switch to {effective === 'online' ? 'Offline' : 'Online'}
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-mono">Admin Only</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {update.isError && (
          <p role="alert" className="chip chip-danger text-xs font-mono mt-2">
            Policy modification failed; previous configuration restored automatically.
          </p>
        )}
      </section>

      {/* Egress Ledger Audit Panel */}
      {canRead && (
        <section className="panel bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <Lock size={16} className="text-amber-500" />
                Immutable Egress Audit Ledger
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every external dispatch attempt, circuit breaker block, and PII redaction event is committed to this append-only ledger.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Total Recorded: <strong className="text-slate-200">{ledger.data?.total ?? 0}</strong>
            </span>
          </div>

          {ledger.isPending ? (
            <p className="text-xs font-mono text-slate-400 py-6 text-center">Loading egress ledger log…</p>
          ) : ledger.isError ? (
            <p role="alert" className="chip chip-danger text-xs font-mono">Could not retrieve egress ledger log.</p>
          ) : ledger.data.data.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No egress dispatches recorded. System running completely local.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Capability</th>
                    <th>Destination</th>
                    <th>Payload Type</th>
                    <th>Mode</th>
                    <th>Outcome</th>
                    <th>PII Redacted</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[11px]">
                  {ledger.data.data.map((row) => (
                    <tr key={row.id}>
                      <td className="text-slate-400">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="font-bold text-slate-300">{row.capability}</td>
                      <td className="text-slate-400">{row.destination}</td>
                      <td className="text-slate-400">{row.payload_kind}</td>
                      <td>
                        <span
                          className={`chip ${
                            row.mode === 'online' ? 'chip-warning' : 'chip-neutral'
                          }`}
                        >
                          {row.mode}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`chip ${
                            row.outcome === 'blocked' ? 'chip-danger' : 'chip-success'
                          }`}
                        >
                          {row.outcome}
                        </span>
                      </td>
                      <td>
                        {row.redacted ? (
                          <span className="chip chip-success">YES</span>
                        ) : (
                          <span className="chip chip-neutral">NO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            <button
              className="btn-secondary py-1 px-2.5 text-[11px]"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 20))}
            >
              <ChevronLeft size={13} />
              Previous
            </button>
            <span className="font-mono text-[11px]">
              Page {Math.floor(offset / 20) + 1} of {Math.max(1, Math.ceil((ledger.data?.total ?? 0) / 20))}
            </span>
            <button
              className="btn-secondary py-1 px-2.5 text-[11px]"
              disabled={!ledger.data || offset + 20 >= ledger.data.total}
              onClick={() => setOffset(offset + 20)}
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
