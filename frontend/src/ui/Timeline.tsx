import type { ComponentType, ReactNode } from 'react'
import { Activity, Clock } from 'lucide-react'
import { cn } from './utils'

export interface TimelineEvent {
  id: string | number
  title: string
  timestamp: string
  officer?: string | null
  unit?: string | null
  remark?: string | null
  status?: string | null
  icon?: ComponentType<{ className?: string }>
  badge?: ReactNode
}

export interface TimelineProps {
  events: TimelineEvent[]
  className?: string
  emptyMessage?: string
}

export function Timeline({
  events,
  className,
  emptyMessage = 'No historical actions recorded for this case yet.',
}: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-[#5B6068] bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('relative pl-6 space-y-6', className)}>
      <div
        className="absolute left-2.5 top-2 bottom-2 w-px bg-[#DAD6CC]"
        aria-hidden="true"
      />

      {events.map((evt, idx) => {
        const Icon = evt.icon || Activity
        return (
          <div key={evt.id ?? idx} className="relative flex items-start gap-3">
            <div className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-[#FFFFFF] border-2 border-[#1F3A5F] flex items-center justify-center text-[#1F3A5F] shadow-xs">
              <Icon className="w-2.5 h-2.5" />
            </div>

            <div className="flex-1 min-w-0 bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-[#1B1F24]">
                    {evt.title}
                  </h4>
                  {evt.badge}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-[#5B6068]">
                  <Clock className="w-3 h-3 text-[#8C8A82]" />
                  <span>{evt.timestamp}</span>
                </div>
              </div>

              {(evt.officer || evt.unit) && (
                <div className="text-[11px] font-mono text-[#5B6068] mb-1">
                  {evt.officer && <span className="font-medium text-[#1B1F24]">{evt.officer}</span>}
                  {evt.officer && evt.unit && <span> · </span>}
                  {evt.unit && <span>{evt.unit}</span>}
                </div>
              )}

              {evt.remark && (
                <p className="text-xs text-[#1B1F24] bg-[#F6F5F1] border border-[#DAD6CC] rounded-[4px] p-2 mt-2 leading-relaxed">
                  {evt.remark}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
