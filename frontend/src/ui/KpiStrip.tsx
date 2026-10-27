import type { ComponentType } from 'react'
import { cn } from './utils'

export interface KpiItem {
  id: string
  label: string
  value: number | string | undefined
  sub?: string
  icon?: ComponentType<{ className?: string }>
  variant?: 'default' | 'accent' | 'danger' | 'warning' | 'success'
}

export interface KpiStripProps {
  items: KpiItem[]
  className?: string
}

export function KpiStrip({ items, className }: KpiStripProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3',
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.id}
            className={cn(
              'bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-3 flex flex-col justify-between shadow-xs transition-colors hover:border-[#8C8A82]',
              item.variant === 'danger' && 'border-l-4 border-l-[#B42318]',
              item.variant === 'warning' && 'border-l-4 border-l-[#9A4A00]',
              item.variant === 'accent' && 'border-l-4 border-l-[#8A4B08]',
              item.variant === 'success' && 'border-l-4 border-l-[#067647]'
            )}
          >
            <div className="flex items-center justify-between text-[#5B6068] mb-1.5">
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider truncate">
                {item.label}
              </span>
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />}
            </div>

            <div className="text-xl font-mono font-semibold text-[#1B1F24] tabular-nums tracking-tight">
              {item.value ?? '—'}
            </div>

            {item.sub && (
              <div className="text-[10px] text-[#5B6068] mt-1 truncate">
                {item.sub}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
