import type React from 'react'
import { ShieldAlert, AlertCircle, Info } from 'lucide-react'
import { cn } from './utils'

export type OverlapLevel = 'high' | 'medium' | 'low' | 'info' | string

interface LevelConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  className: string
}

const levelConfigs: Record<string, LevelConfig> = {
  high: {
    label: 'High Overlap',
    icon: ShieldAlert,
    className: 'text-[#B42318] bg-[#FDECEA] border-[#F8B7B2]',
  },
  medium: {
    label: 'Medium Overlap',
    icon: AlertCircle,
    className: 'text-[#9A4A00] bg-[#FFF3E0] border-[#FCD299]',
  },
  low: {
    label: 'Informational',
    icon: Info,
    className: 'text-[#175CD3] bg-[#E8F0FE] border-[#B8D5FA]',
  },
  info: {
    label: 'Informational',
    icon: Info,
    className: 'text-[#175CD3] bg-[#E8F0FE] border-[#B8D5FA]',
  },
}

export interface LevelBadgeProps {
  level: OverlapLevel
  probability?: number
  className?: string
  showIcon?: boolean
}

export function LevelBadge({
  level,
  probability,
  className,
  showIcon = true,
}: LevelBadgeProps) {
  const normalizedKey = (level || 'info').toLowerCase()
  const config = levelConfigs[normalizedKey] || levelConfigs.info
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-xs font-mono font-medium whitespace-nowrap',
        config.className,
        className
      )}
      role="status"
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span className="uppercase">{config.label}</span>
      {typeof probability === 'number' && (
        <span className="font-mono tabular-nums opacity-90 border-l border-current/25 pl-1.5 ml-0.5">
          {Math.round(probability * 100)}%
        </span>
      )}
    </span>
  )
}
