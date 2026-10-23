import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Database, Activity, ToggleLeft, ToggleRight } from 'lucide-react'
import { getPolicy, setPolicy, getModelVersions, getParameterRegistry, getEvaluationReport } from '../lib/api'

export default function AdminPage() {
  const qc = useQueryClient()
  const { data: policyData } = useQuery({ queryKey: ['policy'], queryFn: getPolicy })
  const { data: models = [] } = useQuery({ queryKey: ['models'], queryFn: getModelVersions })
  const { data: params = [] } = useQuery({ queryKey: ['params'], queryFn: getParameterRegistry })
  const { data: evalReport } = useQuery({ queryKey: ['eval-report'], queryFn: getEvaluationReport })

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

        {/* Stage 10: Baseline vs Learned Evaluation Card */}
        {evalReport && (
          <div className="card p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Activity size={14} className="text-emerald-400" /> Stage 10 ML Validation: Scorer vs Raw Baseline
              </h2>
              <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                Group-Split (No Institution Leakage)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="text-xs text-slate-400 font-medium">PR-AUC Improvement</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  +{evalReport.delta_pr_auc}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  0.130 (Cosine) → <span className="text-emerald-300 font-bold">{evalReport.metrics_learned?.pr_auc}</span> (Calibrated Scorer)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="text-xs text-slate-400 font-medium">High Alert Precision</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">
                  {(evalReport.metrics_learned?.high_precision * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  vs 16.3% on raw cosine baseline (Prevents Alert Fatigue)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="text-xs text-slate-400 font-medium">Medium Alert Recall</div>
                <div className="text-2xl font-bold text-purple-400 mt-1">
                  {(evalReport.metrics_learned?.medium_recall * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Catches &gt;90% of cross-bureau duplications
                </div>
              </div>
            </div>

            {/* Comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="py-2 text-left">Model Strategy</th>
                    <th className="py-2 text-left">Threshold / Cutoff</th>
                    <th className="py-2 text-left">Precision</th>
                    <th className="py-2 text-left">Recall</th>
                    <th className="py-2 text-left">PR-AUC</th>
                    <th className="py-2 text-left">Alert Fatigue Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr>
                    <td className="py-2.5 font-medium text-slate-300">Baseline (Cosine Sim only)</td>
                    <td className="py-2.5 font-mono text-slate-400">cos &gt;= 0.80</td>
                    <td className="py-2.5 font-mono text-rose-400">{(evalReport.metrics_baseline?.precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 font-mono text-slate-300">{(evalReport.metrics_baseline?.recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 font-mono text-slate-400">{evalReport.metrics_baseline?.pr_auc}</td>
                    <td className="py-2.5 text-rose-400">Severe (84% false alarms)</td>
                  </tr>
                  <tr className="bg-emerald-500/5">
                    <td className="py-2.5 font-medium text-emerald-300">CaseNexus Calibrated (High)</td>
                    <td className="py-2.5 font-mono text-emerald-400">&gt;= {evalReport.metrics_learned?.high_threshold}</td>
                    <td className="py-2.5 font-mono text-emerald-400 font-bold">{(evalReport.metrics_learned?.high_precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 font-mono text-slate-300">{(evalReport.metrics_learned?.high_recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 font-mono text-emerald-400 font-bold">{evalReport.metrics_learned?.pr_auc}</td>
                    <td className="py-2.5 text-emerald-400">High Confidence Actionable</td>
                  </tr>
                  <tr className="bg-purple-500/5">
                    <td className="py-2.5 font-medium text-purple-300">CaseNexus Calibrated (Medium)</td>
                    <td className="py-2.5 font-mono text-purple-400">&gt;= {evalReport.metrics_learned?.medium_threshold}</td>
                    <td className="py-2.5 font-mono text-purple-400">{(evalReport.metrics_learned?.medium_precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 font-mono text-purple-300 font-bold">{(evalReport.metrics_learned?.medium_recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 font-mono text-emerald-400 font-bold">{evalReport.metrics_learned?.pr_auc}</td>
                    <td className="py-2.5 text-purple-400">Broad Safety Net Flag</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
