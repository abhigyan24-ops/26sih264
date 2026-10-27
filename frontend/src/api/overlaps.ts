import api, { apiWithMeta } from '../lib/api'
export interface Overlap {
  id: number; level: 'high' | 'medium' | 'info'; probability: number; status: string;
  institution: string; a_id: number; a_ref: string; a_bureau: string; a_cat: string; a_desc: string;
  b_id: number; b_ref: string; b_bureau: string; b_cat: string; b_desc: string;
  breakdown: Record<string, {value: number; contribution: number}> | null;
  explanation: string | null; explanation_src: string; decision_reason: string | null;
}
export interface Decision {decision: 'link' | 'dismiss'; lead_bureau?: string; hold_other?: boolean; reason?: string; note?: string}
export const listOverlaps = (status: string, level: string, offset: number) => apiWithMeta<Overlap[]>('/overlaps', {status, level: level || undefined, offset, limit: 20})
export const loadOverlap = async (id: number) => (await api.get<Overlap>(`/overlaps/${id}`)).data
export const dismissReasons = async () => (await api.get<string[]>('/overlaps/dismiss-reasons')).data
export const saveDecision = async (id: number, body: Decision) => api.post(`/overlaps/${id}/decide`, body)
