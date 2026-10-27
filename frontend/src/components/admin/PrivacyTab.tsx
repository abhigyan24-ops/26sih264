import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loadPolicy, loadLedger, usePolicyChange } from '../../api/privacy'
import type { Scope } from '../../api/privacy'
import { me } from '../../lib/api'
import { ModeToggle } from '../../ui/ModeToggle'
import { Shield, Lock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

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
    return <p className="text-xs text-[#5B6068] font-mono p-4">Loading privacy policy…</p>
  }
  if (policy.isError) {
    return (
      <div role="alert" className="p-4 bg-[#FDECEA] border border-[#F8B7B2] rounded-[6px] text-xs text-[#B42318] font-mono flex items-center gap-2">
        <AlertCircle size={15} />
        <span>Could not load privacy policy configuration.</span>
      </div>
    )
  }

  const settings = policy.data.settings
  const scopes: Scope[] = ['global', 'email', 'explain', 'enrich']

  return (
    <div className="space-y-6">
      {/* Policy Table Panel */}
      <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-4">
        <div className="border-b border-[#DAD6CC] pb-3">
          <h2 className="text-sm font-semibold text-[#1B1F24] flex items-center gap-2 uppercase tracking-wide">
            <Shield size={16} className="text-[#1F3A5F]" />
            Data Privacy & Egress Governance Policy
          </h2>
          <p className="text-xs text-[#5B6068] mt-1">
            Strict fail-closed enforcement: sensitive complaints are unconditionally air-gapped. External services operate via redacted local stubs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#DAD6CC] text-[#5B6068] text-[11px] font-semibold uppercase tracking-wider bg-[#F6F5F1]">
                <th className="py-2.5 px-3">Capability Scope</th>
                <th className="py-2.5 px-3">Configured Value</th>
                <th className="py-2.5 px-3">Effective Route</th>
                <th className="py-2.5 px-3">Last Modified</th>
                <th className="py-2.5 px-3 text-right">Physical Mode Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DAD6CC]">
              {scopes.map((scope) => {
                const row = settings.find((item) => item.scope === scope)
                const globalValue = settings.find((item) => item.scope === 'global')?.value ?? 'offline'
                const effective = row?.value ?? globalValue
                const isOnline = effective === 'online'
                const isAdmin = user.data?.role === 'admin'

                return (
                  <tr key={scope} className="hover:bg-[#F6F5F1] transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[#1B1F24] capitalize">
                      {scope}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {row?.value ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[4px] border text-[10px] font-semibold ${
                            isOnline
                              ? 'bg-[#FFF3E0] text-[#9A4A00] border-[#FCD299]'
                              : 'bg-[#E6F4EC] text-[#067647] border-[#A8E2C2]'
                          }`}
                        >
                          {row.value.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-[#5B6068] font-mono text-[11px]">Inherited</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[4px] border text-[10px] font-semibold ${
                          effective === 'online'
                            ? 'bg-[#FFF3E0] text-[#9A4A00] border-[#FCD299]'
                            : 'bg-[#E6F4EC] text-[#067647] border-[#A8E2C2]'
                        }`}
                      >
                        {effective.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#5B6068] text-[11px]">
                      {row ? new Date(row.changed_at).toLocaleString() : 'System Default'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isAdmin ? (
                        <div className="inline-flex items-center justify-end">
                          <ModeToggle
                            mode={effective === 'online' ? 'online' : 'offline'}
                            onToggle={() =>
                              update.change(scope, effective === 'online' ? 'offline' : 'online')
                            }
                            disabled={update.isPending}
                            size="sm"
                            showIndicator={true}
                          />
                        </div>
                      ) : (
                        <span className="text-[#5B6068] text-[11px] font-mono">Admin Only</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {update.isError && (
          <p role="alert" className="p-3 bg-[#FDECEA] border border-[#F8B7B2] text-[#B42318] text-xs font-mono rounded-[4px]">
            Policy modification failed; previous configuration restored automatically.
          </p>
        )}
      </section>

      {/* Egress Ledger Audit Panel */}
      {canRead && (
        <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#DAD6CC] pb-3 gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#1B1F24] flex items-center gap-2 uppercase tracking-wide">
                <Lock size={16} className="text-[#9A4A00]" />
                Immutable Egress Audit Ledger
              </h2>
              <p className="text-xs text-[#5B6068] mt-1">
                Every external dispatch attempt, circuit breaker block, and PII redaction event is committed to this append-only ledger.
              </p>
            </div>
            <span className="text-xs font-mono text-[#5B6068] shrink-0">
              Total Recorded: <strong className="text-[#1B1F24]">{ledger.data?.total ?? 0}</strong>
            </span>
          </div>

          {ledger.isPending ? (
            <p className="text-xs font-mono text-[#5B6068] py-8 text-center">Loading egress ledger log…</p>
          ) : ledger.isError ? (
            <p role="alert" className="p-3 bg-[#FDECEA] border border-[#F8B7B2] text-[#B42318] text-xs font-mono rounded-[4px]">
              Could not retrieve egress ledger log.
            </p>
          ) : ledger.data.data.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#5B6068] font-mono">
              No egress dispatches recorded. System running completely local.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#DAD6CC] text-[#5B6068] text-[11px] font-semibold uppercase tracking-wider bg-[#F6F5F1]">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Capability</th>
                    <th className="py-2 px-3">Destination</th>
                    <th className="py-2 px-3">Payload Type</th>
                    <th className="py-2 px-3">Mode</th>
                    <th className="py-2 px-3">Outcome</th>
                    <th className="py-2 px-3">PII Redacted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DAD6CC] font-mono text-[11px]">
                  {ledger.data.data.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F6F5F1] transition-colors">
                      <td className="py-2.5 px-3 text-[#5B6068]">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#1B1F24]">{row.capability}</td>
                      <td className="py-2.5 px-3 text-[#5B6068]">{row.destination}</td>
                      <td className="py-2.5 px-3 text-[#5B6068]">{row.payload_kind}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-[4px] border text-[10px] ${
                            row.mode === 'online'
                              ? 'bg-[#FFF3E0] text-[#9A4A00] border-[#FCD299]'
                              : 'bg-[#EFEDE7] text-[#5B6068] border-[#DAD6CC]'
                          }`}
                        >
                          {row.mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-[4px] border text-[10px] ${
                            row.outcome === 'blocked'
                              ? 'bg-[#FDECEA] text-[#B42318] border-[#F8B7B2]'
                              : 'bg-[#E6F4EC] text-[#067647] border-[#A8E2C2]'
                          }`}
                        >
                          {row.outcome}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {row.redacted ? (
                          <span className="inline-block px-1.5 py-0.5 rounded-[4px] bg-[#E6F4EC] text-[#067647] border border-[#A8E2C2] text-[10px] font-semibold">
                            YES
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded-[4px] bg-[#EFEDE7] text-[#5B6068] border border-[#DAD6CC] text-[10px]">
                            NO
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-between items-center text-xs text-[#5B6068] pt-2 border-t border-[#DAD6CC]">
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] rounded-[4px] disabled:opacity-50 disabled:pointer-events-none transition-colors"
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
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] rounded-[4px] disabled:opacity-50 disabled:pointer-events-none transition-colors"
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
