import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Shield, Database, Activity, ToggleLeft, ToggleRight } from 'lucide-react'
import { getPolicy, setPolicy, getModelVersions, getParameterRegistry } from '../lib/api'

export default function AdminPage() {
  const qc = useQueryClient()
  const { data: policyData } = useQuery({ queryKey: ['policy'], queryFn: getPolicy })
  const { data: models = [] } = useQuery({ queryKey: ['models'], queryFn: getModelVersions })
  const { data: params = [] } = useQuery({ queryKey: ['params'], queryFn: getParameterRegistry })

  const updatePolicy = useMutation({
    mutationFn: ({ scope, value }: { scope: string; value: string }) => setPolicy(scope, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policy'] })
  })

  const settings: any[] = policyData?.settings || []
  const globalMode = settings.find(s => s.scope === 'global')?.value || 'offline'

  const toggleGlobal = () => {
    updatePolicy.mutate({ scope: 'global', value: globalMode === 'online' ? 'offline' : 'online' })
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user.role === 'admin'

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <p className="text-sm text-slate-500 mt-0.5">Model governance, policy settings, and system configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Policy settings */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Shield size={14} /> Online / Offline Mode Policy
          </h2>
          {!isAdmin && (
            <div className="text-xs text-amber-500 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Read-only — Admin role required to change settings
            </div>
          )}

          {/* Global toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-3">
            <div>
              <div className="text-sm font-medium">Global Mode</div>
              <div className="text-xs text-slate-500 mt-0.5">Applies to all capabilities unless overridden</div>
            </div>
            <button
              onClick={toggleGlobal}
              disabled={!isAdmin || updatePolicy.isPending}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                globalMode === 'online' ? 'text-emerald-400' : 'text-slate-400'
              } disabled:cursor-not-allowed`}
            >
              {globalMode === 'online' ? <ToggleRight size={28} className="text-emerald-400" /> : <ToggleLeft size={28} />}
              {globalMode}
            </button>
          </div>

          {/* All settings */}
          <div className="space-y-2">
            {settings.map(s => (
              <div key={s.scope} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50 last:border-0">
                <div>
                  <span className="text-slate-300 font-medium">{s.scope}</span>
                  <span className="text-slate-600 ml-2">changed {s.changed_at?.split('T')[0]}</span>
                </div>
                <span className={s.value === 'online' ? 'text-emerald-400' : 'text-slate-500'}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Parameter registry */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity size={14} /> Parameter Registry
          </h2>
          <div className="space-y-3">
            {(params as any[]).map((p: any) => (
              <div key={p.id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-slate-300">{p.parameter}</span>
                  <span className="font-mono text-sm font-bold text-blue-400">{p.value}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    p.origin === 'learned_synthetic' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    p.origin === 'learned' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                  }`}>{p.origin}</span>
                  {p.model_version && <span className="text-xs text-slate-600 font-mono">{p.model_version}</span>}
                </div>
                {p.derived_from && <div className="text-xs text-slate-600 mt-1">{p.derived_from}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Model versions */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Database size={14} /> Model Versions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800">
                  <th className="px-3 py-2 text-left">Version ID</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">PR-AUC</th>
                  <th className="px-3 py-2 text-left">High Prec</th>
                  <th className="px-3 py-2 text-left">Med Recall</th>
                  <th className="px-3 py-2 text-left">Trained On</th>
                  <th className="px-3 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {(models as any[]).map((m: any) => (
                  <tr key={m.id} className="table-row">
                    <td className="px-3 py-2.5 font-mono text-xs text-blue-400">{m.id}</td>
                    <td className="px-3 py-2.5">
                      <span className={m.status === 'active' ? 'badge-success' : m.status === 'shadow' ? 'badge-info' : 'badge-muted'}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{m.metrics?.pr_auc}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{m.metrics?.high?.precision?.toFixed(3)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{m.metrics?.medium?.recall?.toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 max-w-xs truncate">{m.trained_on}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{m.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-slate-600 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
            All metrics labelled <code>SYNTHETIC EVALUATION</code> — trained on synthetic seed data only.
            PR-AUC 0.93 reflects planted overlap pairs; real-world performance will differ.
          </div>
        </div>
      </div>
    </div>
  )
}
