import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  loadModels,
  loadDisagreements,
  promoteModel,
  rollbackModel,
  metric,
} from '../../api/evaluation'
import type { PairError } from '../../api/evaluation'
import { me } from '../../lib/api'
import { AlertTriangle, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

function Errors({ title, items }: { title: string; items: PairError[] }) {
  return (
    <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-4 space-y-2">
      <h3 className="text-xs font-semibold text-[#1B1F24] uppercase tracking-wider">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-[#5B6068]">None at the Medium threshold.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#DAD6CC] text-[#5B6068] text-[11px]">
                <th className="text-left py-1.5">Case pair</th>
                <th className="text-right py-1.5">Probability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DAD6CC]">
              {items.map((row) => (
                <tr key={`${row.case_a}-${row.case_b}`}>
                  <td className="py-1.5">
                    <Link className="text-[#2a78d6] hover:underline font-mono" to={`/cases/${row.case_a}`}>
                      #{row.case_a}
                    </Link>{' '}
                    /{' '}
                    <Link className="text-[#2a78d6] hover:underline font-mono" to={`/cases/${row.case_b}`}>
                      #{row.case_b}
                    </Link>
                  </td>
                  <td className="text-right font-mono py-1.5 text-[#1B1F24]">{metric(row.probability)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function EvaluationTab() {
  const [selectedId, setSelectedId] = useState('')
  const [offset, setOffset] = useState(0)
  const [message, setMessage] = useState('')
  const qc = useQueryClient()
  const user = useQuery({ queryKey: ['me'], queryFn: me })
  const models = useQuery({ queryKey: ['evaluation-models'], queryFn: loadModels })
  const hasShadow = models.data?.some((model) => model.status === 'shadow') ?? false
  const disagreements = useQuery({
    queryKey: ['shadow-disagreements', offset],
    queryFn: () => loadDisagreements(offset),
    enabled: hasShadow,
  })

  const publication = useMutation({
    mutationFn: (action: { kind: 'promote'; version: string } | { kind: 'rollback' }) =>
      action.kind === 'promote' ? promoteModel(action.version) : rollbackModel(),
    onSuccess: () => {
      setMessage('Model publication completed.')
      for (const key of ['evaluation-models', 'model-card', 'shadow-disagreements', 'models']) {
        void qc.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: () =>
      setMessage('Model publication failed. Check that the model artifact is available, then retry.'),
  })

  if (models.isPending) {
    return <p className="text-xs text-[#5B6068] font-mono p-4">Loading evaluation models…</p>
  }
  if (models.isError) {
    return (
      <div role="alert" className="p-4 bg-[#FDECEA] border border-[#F8B7B2] rounded-[6px] text-xs text-[#B42318] flex items-center justify-between">
        <span>Evaluation data could not load from server.</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px]"
          onClick={() => void models.refetch()}
        >
          <RotateCcw className="w-3 h-3" />
          Retry
        </button>
      </div>
    )
  }
  if (!models.data.length) {
    return (
      <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-6 text-center text-xs text-[#5B6068]">
        No models registered. Train the synthetic overlap model first.
      </div>
    )
  }

  const selected =
    models.data.find((model) => model.id === selectedId) ??
    models.data.find((model) => model.status === 'active') ??
    models.data[0]
  const evaluation = selected.metrics.evaluation
  const isAdmin = user.data?.role === 'admin'

  return (
    <div className="space-y-5">
      {/* Synthetic Data Warning Banner */}
      <div className="p-3.5 bg-[#FFF3E0] border border-[#FCD299] text-[#9A4A00] rounded-[4px] text-xs flex items-center gap-2">
        <AlertTriangle size={15} className="shrink-0 text-[#B54708]" />
        <span>
          <strong>Synthetic prototype telemetry:</strong> Metrics reflect generated simulation data rather than real-world operational accuracy. Review calibration tables and false-positive distributions prior to model promotion.
        </span>
      </div>

      {/* Model Selection and Registry Summary */}
      <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="model-select" className="text-xs font-medium text-[#1B1F24]">
              Model version:
            </label>
            <select
              id="model-select"
              className="bg-[#FFFFFF] border border-[#DAD6CC] text-[#1B1F24] rounded-[4px] px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]"
              value={selected.id}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {models.data.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id} ({model.status})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-mono text-[#5B6068]">
            Trained: {selected.trained_on} · Status: <strong className="text-[#1B1F24] uppercase">{selected.status}</strong>
          </span>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1F3A5F] hover:bg-[#17304F] rounded-[4px] shadow-sm disabled:opacity-50 transition-colors"
              disabled={publication.isPending}
              onClick={() => {
                if (window.confirm(`Promote ${selected.id} as the active model?`)) {
                  publication.mutate({ kind: 'promote', version: selected.id })
                }
              }}
            >
              <CheckCircle2 size={13} />
              Promote selected model
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] rounded-[4px] disabled:opacity-50 transition-colors"
              disabled={publication.isPending}
              onClick={() => {
                if (window.confirm('Roll back to the previous active model?')) {
                  publication.mutate({ kind: 'rollback' })
                }
              }}
            >
              <RotateCcw size={13} />
              Roll back
            </button>
          </div>
        )}

        {message && (
          <p
            role={publication.isError ? 'alert' : 'status'}
            className={`p-2 rounded-[4px] text-xs font-mono ${
              publication.isError ? 'bg-[#FDECEA] text-[#B42318]' : 'bg-[#E6F4EC] text-[#067647]'
            }`}
          >
            {message}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#DAD6CC] text-[#5B6068] text-[11px] font-semibold uppercase tracking-wider bg-[#F6F5F1]">
                <th className="py-2 px-3">Model</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-center">PR-AUC</th>
                <th className="py-2 px-3 text-center">High Precision</th>
                <th className="py-2 px-3 text-center">Medium Recall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DAD6CC] font-mono">
              {models.data.map((model) => (
                <tr key={model.id} className="hover:bg-[#F6F5F1] transition-colors">
                  <td className="py-2 px-3 font-semibold text-[#1B1F24]">{model.id}</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-[4px] text-[10px] uppercase font-semibold ${
                        model.status === 'active'
                          ? 'bg-[#E6F4EC] text-[#067647] border border-[#A8E2C2]'
                          : 'bg-[#EFEDE7] text-[#5B6068] border border-[#DAD6CC]'
                      }`}
                    >
                      {model.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center text-[#1B1F24]">
                    {metric(model.metrics.evaluation?.pr_auc ?? model.metrics.pr_auc_test)}
                  </td>
                  <td className="py-2 px-3 text-center text-[#1B1F24]">
                    {metric((model.metrics.evaluation?.high ?? model.metrics.high)?.precision)}
                  </td>
                  <td className="py-2 px-3 text-center text-[#1B1F24]">
                    {metric((model.metrics.evaluation?.medium ?? model.metrics.medium)?.recall)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!evaluation ? (
        <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 text-xs text-[#5B6068]">
          Full evaluation is unavailable for this version. Run <code>python -m ml.evaluate</code> when it is active to generate calibration and error lists.
        </div>
      ) : (
        <>
          {/* Baseline Comparison */}
          <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-2">
              <h2 className="text-xs font-semibold text-[#1B1F24] uppercase tracking-wider">
                Baseline Comparison
              </h2>
              <span className="text-xs font-mono text-[#5B6068]">
                Alerts per active case: <strong className="text-[#1B1F24]">{metric(evaluation.alerts_per_active_case)}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#DAD6CC] text-[#5B6068] text-[11px] font-semibold uppercase tracking-wider bg-[#F6F5F1]">
                    <th className="py-2 px-3">Score</th>
                    <th className="py-2 px-3 text-center">Threshold</th>
                    <th className="py-2 px-3 text-center">Precision</th>
                    <th className="py-2 px-3 text-center">Recall</th>
                    <th className="py-2 px-3 text-center">PR-AUC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DAD6CC] font-mono">
                  {[
                    { name: 'High', score: evaluation.high },
                    { name: 'Medium', score: evaluation.medium },
                    { name: 'Cosine baseline', score: evaluation.baseline },
                  ].map((row) => (
                    <tr key={row.name} className="hover:bg-[#F6F5F1] transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#1B1F24]">{row.name}</td>
                      <td className="py-2 px-3 text-center">{metric(row.score.threshold)}</td>
                      <td className="py-2 px-3 text-center">{metric(row.score.precision)}</td>
                      <td className="py-2 px-3 text-center">{metric(row.score.recall)}</td>
                      <td className="py-2 px-3 text-center">
                        {metric(row.name === 'Cosine baseline' ? evaluation.baseline.pr_auc : evaluation.pr_auc)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Calibration Table */}
          <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-3">
            <h2 className="text-xs font-semibold text-[#1B1F24] uppercase tracking-wider border-b border-[#DAD6CC] pb-2">
              Probability Calibration
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#DAD6CC] text-[#5B6068] text-[11px] font-semibold uppercase tracking-wider bg-[#F6F5F1]">
                    <th className="py-2 px-3 text-center">Mean Predicted Probability</th>
                    <th className="py-2 px-3 text-center">Observed Positive Fraction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DAD6CC] font-mono">
                  {evaluation.calibration.map((row, index) => (
                    <tr key={index} className="hover:bg-[#F6F5F1] transition-colors">
                      <td className="py-2 px-3 text-center text-[#1B1F24]">{metric(row.mean_predicted)}</td>
                      <td className="py-2 px-3 text-center text-[#1B1F24]">{metric(row.observed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Error Distributions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Errors title="Worst false positives" items={evaluation.false_positives} />
            <Errors title="Worst false negatives" items={evaluation.false_negatives} />
          </div>
        </>
      )}

      {/* Shadow Disagreements */}
      <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-5 space-y-3">
        <h2 className="text-xs font-semibold text-[#1B1F24] uppercase tracking-wider border-b border-[#DAD6CC] pb-2">
          Shadow Disagreements
        </h2>
        {!hasShadow ? (
          <p className="text-xs text-[#5B6068]">No shadow model currently active.</p>
        ) : disagreements.isPending ? (
          <p className="text-xs text-[#5B6068] font-mono">Loading shadow comparisons…</p>
        ) : disagreements.isError ? (
          <p role="alert" className="text-xs text-[#B42318] font-mono">
            Shadow comparisons could not load.
          </p>
        ) : (
          <>
            <p className="text-xs text-[#5B6068]">{disagreements.data.coverage}</p>
            <p className="text-xs text-[#1B1F24] font-mono">
              {disagreements.data.total} disagreements · estimated extra alerts/day: {metric(disagreements.data.extra_alerts_per_day_estimate)}
            </p>
            {disagreements.data.items.length === 0 ? (
              <p className="text-xs text-[#5B6068]">No observed disagreements yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#DAD6CC] text-[#5B6068] text-[11px] font-semibold uppercase tracking-wider bg-[#F6F5F1]">
                      <th className="py-2 px-3">Cases</th>
                      <th className="py-2 px-3 text-center">Active</th>
                      <th className="py-2 px-3 text-center">Shadow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DAD6CC] font-mono">
                    {disagreements.data.items.map((row) => (
                      <tr key={`${row.model_version}-${row.case_a}-${row.case_b}`} className="hover:bg-[#F6F5F1] transition-colors">
                        <td className="py-2 px-3 text-[#1B1F24]">
                          {row.a_ref} / {row.b_ref}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.active_level} ({metric(row.active_probability)})
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.shadow_level} ({metric(row.shadow_probability)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-[#DAD6CC]">
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] rounded-[4px] disabled:opacity-50 transition-colors"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                <ChevronLeft size={13} />
                Previous
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#DAD6CC] hover:bg-[#EFEDE7] rounded-[4px] disabled:opacity-50 transition-colors"
                disabled={offset + 20 >= disagreements.data.total}
                onClick={() => setOffset(offset + 20)}
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
