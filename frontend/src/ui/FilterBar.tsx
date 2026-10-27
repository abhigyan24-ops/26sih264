import type { ReactNode } from 'react'
import { Search, X, RotateCcw } from 'lucide-react'
import { cn } from './utils'

export interface FilterItem {
  id: string
  label: string
  value: string
  onRemove: () => void
}

export interface FilterBarProps {
  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  children?: ReactNode
  activeFilters?: FilterItem[]
  onResetAll?: () => void
  className?: string
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records by keywords...',
  children,
  activeFilters = [],
  onResetAll,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-3 mb-4 space-y-3',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6068] pointer-events-none" />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] placeholder:text-[#5B6068] focus:outline-none focus:border-[#1F6FEB] focus:ring-1 focus:ring-[#1F6FEB]"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#5B6068] hover:text-[#1B1F24]"
                aria-label="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {children}

        {onResetAll && activeFilters.length > 0 && (
          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#5B6068] hover:text-[#1B1F24] border border-transparent hover:border-[#DAD6CC] rounded-[4px] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#EFEDE7]">
          <span className="text-[11px] font-medium text-[#5B6068] uppercase tracking-wider mr-1">
            Active:
          </span>
          {activeFilters.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[#1B1F24] bg-[#EFEDE7] border border-[#DAD6CC] rounded-[4px]"
            >
              <span className="text-[#5B6068]">{f.label}:</span>
              <span>{f.value}</span>
              <button
                type="button"
                onClick={f.onRemove}
                className="hover:text-[#B42318] ml-0.5"
                aria-label={`Remove filter ${f.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
