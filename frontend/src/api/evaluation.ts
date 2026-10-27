import api from '../lib/api'
export interface Score { threshold?: number; flagged?: number; precision: number | null; recall: number | null }
export interface PairError { case_a: number; case_b: number; institution_id: number; probability: number }
export interface Evaluation {
  warning: string; pr_auc: number; high: Score; medium: Score; baseline: Score & {pr_auc: number};
  calibration: {mean_predicted: number; observed: number}[];
  false_positives: PairError[]; false_negatives: PairError[]; alerts_per_active_case: number;
}
export interface Model {id: string; status: string; trained_on: string; created_at: string;
  metrics: {evaluation?: Evaluation; pr_auc_test?: number; high?: Score; medium?: Score}}
export interface Parameter {id: number; parameter: string; value: string; origin: string; derived_from: string | null; metrics: Record<string, unknown> | null; model_version: string | null; created_at: string}
export interface Disagreement {case_a: number; case_b: number; a_ref: string; b_ref: string; shadow_probability: number; active_probability: number; shadow_level: string; active_level: string; model_version: string}
export const loadModels = async () => (await api.get<Model[]>('/evaluation/models')).data
export const loadModelCard = async () => (await api.get<Parameter[]>('/model-card')).data
export const loadDisagreements = async (offset: number) => (await api.get<{total: number; items: Disagreement[]; extra_alerts_per_day_estimate: number; coverage: string}>('/evaluation/shadow-disagreements', {params: {offset, limit: 20}})).data
export const promoteModel = async (version: string) => api.post(`/evaluation/promote/${encodeURIComponent(version)}`)
export const rollbackModel = async () => api.post('/evaluation/rollback')
export const metric = (value: number | null | undefined) => value == null ? '—' : value.toFixed(3)
