import type React from 'react'
import { cn } from './utils'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  icon?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px]',
        className
      )}
    >
      {icon ? (
        <div className="mb-4 text-[#5B6068]">{icon}</div>
      ) : (
        <div className="mb-4 w-16 h-16 rounded-2xl bg-[#EFEDE7] border-2 border-[#DAD6CC] flex items-center justify-center shadow-inner">
          <svg
            className="w-8 h-8 text-[#5B6068]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
      )}

      <h3 className="text-sm font-semibold text-[#1B1F24] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[#5B6068] max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-[#1F3A5F] hover:bg-[#17304F] rounded-[4px] transition-colors focus:ring-2 focus:ring-[#1F6FEB] focus:ring-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
