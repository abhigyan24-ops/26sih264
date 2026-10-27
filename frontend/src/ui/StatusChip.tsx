import type React from 'react'
import {
  Clock,
  UserCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  ArrowRightLeft,
  RefreshCw,
  Inbox,
  HelpCircle,
} from 'lucide-react'
import { cn } from './utils'

export type CaseStatusType =
  | 'received'
  | 'registered'
  | 'assigned'
  | 'under_process'
  | 'escalated'
  | 'action_taken'
  | 'disposed'
  | 'transferred'
  | 'reopened'
  | string

interface StatusConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  className: string
}

const statusMap: Record<string, StatusConfig> = {
  received: {
    label: 'Received',
    icon: Inbox,
    className: 'text-[#5B6068] bg-[#EFEDE7] border-[#DAD6CC]',
  },
  registered: {
    label: 'Registered',
    icon: Clock,
    className: 'text-[#175CD3] bg-[#E8F0FE] border-[#B8D5FA]',
  },
  assigned: {
    label: 'Assigned',
    icon: UserCheck,
    className: 'text-[#175CD3] bg-[#E8F0FE] border-[#B8D5FA]',
  },
  under_process: {
    label: 'Under Process',
    icon: Activity,
    className: 'text-[#175CD3] bg-[#E8F0FE] border-[#B8D5FA]',
  },
  escalated: {
    label: 'Escalated',
    icon: AlertTriangle,
    className: 'text-[#B42318] bg-[#FDECEA] border-[#F8B7B2]',
  },
  action_taken: {
    label: 'Action Taken',
    icon: CheckCircle2,
    className: 'text-[#067647] bg-[#E6F4EC] border-[#A8E2C2]',
  },
  disposed: {
    label: 'Disposed',
    icon: CheckCheck,
    className: 'text-[#067647] bg-[#E6F4EC] border-[#A8E2C2]',
  },
  transferred: {
    label: 'Transferred',
    icon: ArrowRightLeft,
    className: 'text-[#9A4A00] bg-[#FFF3E0] border-[#FCD299]',
  },
  reopened: {
    label: 'Reopened',
    icon: RefreshCw,
    className: 'text-[#9A4A00] bg-[#FFF3E0] border-[#FCD299]',
  },
}

export interface StatusChipProps {
  status: CaseStatusType
  className?: string
  showIcon?: boolean
}

export function StatusChip({ status, className, showIcon = true }: StatusChipProps) {
  const normalizedKey = (status || '').toLowerCase().replace(/\s+/g, '_')
  const config = statusMap[normalizedKey] || {
    label: status ? status.replace(/_/g, ' ') : 'Unknown',
    icon: HelpCircle,
    className: 'text-[#5B6068] bg-[#EFEDE7] border-[#DAD6CC]',
  }
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-xs font-medium tracking-tight whitespace-nowrap',
        config.className,
        className
      )}
      title={`Status: ${config.label}`}
      role="status"
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span className="capitalize">{config.label}</span>
    </span>
  )
}
