import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from './utils'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    setTimeout(() => confirmBtnRef.current?.focus(), 50)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={onCancel}
        className="fixed inset-0 bg-[#000000]/40 backdrop-blur-sm transition-opacity"
      />

      <div
        ref={dialogRef}
        className={cn(
          'relative z-10 w-full max-w-md bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] shadow-lg p-5 overflow-hidden'
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {variant === 'danger' && (
              <div className="p-1.5 rounded-[4px] bg-[#FDECEA] text-[#B42318] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-[#1B1F24]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#5B6068] hover:text-[#1B1F24] p-1 rounded hover:bg-[#EFEDE7] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p
          id="confirm-dialog-description"
          className="text-xs text-[#5B6068] leading-relaxed mb-6"
        >
          {description}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] hover:bg-[#EFEDE7] rounded-[4px] transition-colors focus:ring-2 focus:ring-[#1F6FEB]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-3.5 py-1.5 text-xs font-medium text-white rounded-[4px] transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-[#1F6FEB]',
              variant === 'danger'
                ? 'bg-[#B42318] hover:bg-[#911C13]'
                : 'bg-[#1F3A5F] hover:bg-[#17304F]'
            )}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
