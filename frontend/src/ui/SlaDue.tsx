import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from './utils'

export interface SlaDueProps {
  daysLeft?: number | null
  isBreached?: boolean
  riskLevel?: 'high' | 'medium' | 'low' | 'none'
  className?: string
  showIcon?: boolean
}

export function SlaDue({
  daysLeft,
  isBreached,
  riskLevel,
  className,
  showIcon = true,
}: SlaDueProps) {
  if (isBreached || (typeof daysLeft === 'number' && daysLeft < 0)) {
    const overdueDays = typeof daysLeft === 'number' ? Math.abs(daysLeft) : 0
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-xs font-mono font-medium text-[#B42318] bg-[#FDECEA] border-[#F8B7B2] tabular-nums',
          className
        )}
        title="SLA Breached"
      >
        {showIcon && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
        <span>{overdueDays > 0 ? `Overdue ${overdueDays}d` : 'Breached'}</span>
      </span>
    )
  }

  if (typeof daysLeft === 'number' && daysLeft <= 2) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-xs font-mono font-medium text-[#9A4A00] bg-[#FFF3E0] border-[#FCD299] tabular-nums',
          className
        )}
        title="SLA Risk: Due soon"
      >
        {showIcon && <Clock className="w-3.5 h-3.5 shrink-0" />}
        <span>{daysLeft === 0 ? 'Due Today' : `Due ${daysLeft}d`}</span>
      </span>
    )
  }

  if (typeof daysLeft === 'number') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-xs font-mono font-medium text-[#067647] bg-[#E6F4EC] border-[#A8E2C2] tabular-nums',
          className
        )}
        title="SLA On Track"
      >
        {showIcon && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
        <span>{daysLeft}d remaining</span>
      </span>
    )
  }

  if (riskLevel === 'high') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-xs font-mono font-medium text-[#B42318] bg-[#FDECEA] border-[#F8B7B2]',
          className
        )}
      >
        {showIcon && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
        <span>High Risk</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-xs font-mono text-[#5B6068] bg-[#EFEDE7] border-[#DAD6CC]',
        className
      )}
    >
      <span>Standard SLA</span>
    </span>
  )
}
