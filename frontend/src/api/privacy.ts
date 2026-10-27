import { useMutation, useQueryClient } from '@tanstack/react-query'
import api, { apiWithMeta } from '../lib/api'
export type Mode = 'online' | 'offline'
export type Scope = 'global' | 'email' | 'explain' | 'enrich'
export interface PolicyRow { scope: Scope; value: Mode; changed_at: string }
export interface PolicyStatus { global: Mode; capabilities: Record<Exclude<Scope, 'global'>, Mode>; no_external_calls: boolean }
export interface LedgerRow { id: number; capability: string; destination: string; payload_kind: string; mode: string; outcome: string; redacted: boolean; created_at: string }
export const loadPolicy = async () => (await api.get<{settings: PolicyRow[]}>('/policy')).data
export const loadPolicyStatus = async () => (await api.get<PolicyStatus>('/policy/status')).data
export const loadLedger = (offset: number) => apiWithMeta<LedgerRow[]>('/egress-ledger', {limit: 20, offset})

export function usePolicyChange() {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (body: {scope: Scope; value: Mode}) => api.put('/policy', body),
    onMutate: async body => {
      await Promise.all([qc.cancelQueries({queryKey: ['policy']}), qc.cancelQueries({queryKey: ['policy-status']})])
      const oldPolicy = qc.getQueryData<{settings: PolicyRow[]}>(['policy'])
      const oldStatus = qc.getQueryData<PolicyStatus>(['policy-status'])
      if (oldPolicy) {
        const settings = [...oldPolicy.settings.filter(row => row.scope !== body.scope), {...body, changed_at: new Date().toISOString()}]
        qc.setQueryData(['policy'], {settings})
        const global = settings.find(row => row.scope === 'global')?.value ?? 'offline'
        const effective = (scope: Scope) => settings.find(row => row.scope === scope)?.value ?? global
        const capabilities = {email: effective('email'), explain: effective('explain'), enrich: effective('enrich')}
        qc.setQueryData(['policy-status'], {global, capabilities, no_external_calls: Object.values(capabilities).every(mode => mode === 'offline')})
      }
      return {oldPolicy, oldStatus}
    },
    onError: (_error, _body, previous) => {
      if (previous?.oldPolicy) qc.setQueryData(['policy'], previous.oldPolicy)
      if (previous?.oldStatus) qc.setQueryData(['policy-status'], previous.oldStatus)
    },
    onSettled: () => {
      void qc.invalidateQueries({queryKey: ['policy']})
      void qc.invalidateQueries({queryKey: ['policy-status']})
      void qc.invalidateQueries({queryKey: ['egress']})
    },
  })
  const change = (scope: Scope, value: Mode) => {
    if (value === 'online' && !window.confirm(`Switch ${scope} to online? Non-sensitive requests may use the online provider.`)) return
    mutation.mutate({scope, value})
  }
  return {...mutation, change}
}
