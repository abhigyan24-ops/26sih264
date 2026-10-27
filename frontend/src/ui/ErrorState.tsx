import { AlertCircle, RotateCcw } from 'lucide-react'
import { cn } from './utils'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Unable to Load Records',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-[#FFFFFF] border border-[#F8B7B2] rounded-[6px]',
        className
      )}
    >
      <div className="mb-3 w-12 h-12 rounded-xl bg-[#FDECEA] border border-[#F8B7B2] flex items-center justify-center text-[#B42318]">
        <AlertCircle className="w-6 h-6" />
      </div>

      <h3 className="text-sm font-semibold text-[#1B1F24] mb-1">{title}</h3>
      <p className="text-xs text-[#5B6068] max-w-sm mb-4 leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#EFEDE7] hover:bg-[#DAD6CC] border border-[#DAD6CC] rounded-[4px] transition-colors focus:ring-2 focus:ring-[#1F6FEB]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Operation</span>
        </button>
      )}
    </div>
  )
}
