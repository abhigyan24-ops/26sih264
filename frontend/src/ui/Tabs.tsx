import { useRef, type KeyboardEvent, type ComponentType } from 'react'
import { cn } from './utils'

export interface TabItem {
  id: string
  label: string
  count?: number | string
  icon?: ComponentType<{ className?: string }>
}

export interface TabsProps {
  tabs: TabItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    let nextIndex = index
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1
    } else {
      return
    }

    e.preventDefault()
    const nextTab = tabs[nextIndex]
    onChange(nextTab.id)
    tabRefs.current[nextTab.id]?.focus()
  }

  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 border-b border-[#DAD6CC] overflow-x-auto',
        className
      )}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeId
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el
            }}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap -mb-px',
              isActive
                ? 'border-[#1F3A5F] text-[#1F3A5F] font-semibold'
                : 'border-transparent text-[#5B6068] hover:text-[#1B1F24] hover:border-[#DAD6CC]'
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded font-mono text-[11px] tabular-nums',
                  isActive
                    ? 'bg-[#E8F0FE] text-[#175CD3]'
                    : 'bg-[#EFEDE7] text-[#5B6068]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
