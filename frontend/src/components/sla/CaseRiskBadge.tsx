import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react'
import { getCaseRisk } from '../../api/sla'

interface CaseRiskBadgeProps {
  caseId: number
  closed?: boolean
}

export const CaseRiskBadge: React.FC<CaseRiskBadgeProps> = ({ caseId, closed }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['case-risk', caseId],
    queryFn: () => getCaseRisk(caseId),
    enabled: !closed && !isNaN(caseId) && caseId > 0,
    staleTime: 60_000,
  })

  if (closed) return null

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 animate-pulse">
        <Clock className="w-3 h-3" />
        Risk...
      </span>
    )
  }

  if (isError || !data) return null

  const { risk, basis, n_history } = data

  if (basis === 'history' && risk !== null) {
    const pct = Math.round(risk * 100)
    let cls = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    if (risk >= 0.6) {
      cls = 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
    } else if (risk >= 0.3) {
      cls = 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    }

    return (
      <span
        title={`Survival calculation on ${n_history} closed cases`}
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}
      >
        <ShieldAlert className="w-3 h-3" />
        Breach risk {pct}% (history {n_history})
      </span>
    )
  }

  // Fallback: deadline_only
  return (
    <span
      title={`Insufficient closed cases (${n_history}) for statistical survival curve; standard SLA deadline applies.`}
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 font-medium"
    >
      <AlertCircle className="w-3 h-3" />
      Deadline-only (not enough history)
    </span>
  )
}

export default CaseRiskBadge
