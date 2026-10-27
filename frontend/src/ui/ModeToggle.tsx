import { Lock, ShieldCheck, Wifi } from 'lucide-react'
import { cn } from './utils'

export interface ModeToggleProps {
  mode: 'online' | 'offline'
  onToggle: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
  showIndicator?: boolean
  className?: string
}

/**
 * Civic Ledger Tactile Physical Toggle
 * A skeuomorphic, precision-machined toggle switch for switching between Air-Gapped Local (offline)
 * and External Network (online) modes, with physical lever styling, LED status aperture, and lock states.
 */
export function ModeToggle({
  mode,
  onToggle,
  disabled = false,
  size = 'sm',
  label,
  showIndicator = true,
  className,
}: ModeToggleProps) {
  const isOnline = mode === 'online'

  const isSmall = size === 'sm'

  return (
    <div className={cn('inline-flex items-center gap-2 select-none', className)}>
      {label && (
        <span className="text-xs font-medium text-[#1B1F24] font-mono uppercase tracking-wider">
          {label}
        </span>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={isOnline}
        aria-label={label ? `${label} mode toggle: currently ${mode}` : `Mode toggle: currently ${mode}`}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          'relative inline-flex items-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] focus:ring-offset-1',
          isSmall ? 'h-5 w-10 rounded-full' : 'h-7 w-14 rounded-full',
          // Housing plate with tactile recessed rim
          isOnline
            ? 'bg-[#FEE4E2] border border-[#F8B7B2]'
            : 'bg-[#E6F4EC] border border-[#A8E2C2]',
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer hover:shadow-inner active:scale-95 transition-transform'
        )}
      >
        {/* Internal recessed channel track */}
        <span
          className={cn(
            'pointer-events-none inline-block transform rounded-full bg-[#FFFFFF] shadow-sm ring-1 ring-black/10 transition-transform duration-200 ease-in-out flex items-center justify-center',
            isSmall ? 'h-3.5 w-3.5' : 'h-5 w-5',
            isOnline
              ? isSmall ? 'translate-x-5' : 'translate-x-8'
              : 'translate-x-0.5'
          )}
        >
          {disabled ? (
            <Lock className={cn('text-[#5B6068]', isSmall ? 'w-2 h-2' : 'w-2.5 h-2.5')} />
          ) : isOnline ? (
            <span className={cn('rounded-full bg-[#B42318]', isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
          ) : (
            <span className={cn('rounded-full bg-[#067647]', isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
          )}
        </span>
      </button>

      {showIndicator && (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-mono text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded-[3px] border',
            isOnline
              ? 'bg-[#FFF3E0] text-[#9A4A00] border-[#FCD299]'
              : 'bg-[#E6F4EC] text-[#067647] border-[#A8E2C2]'
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="w-2.5 h-2.5 text-[#9A4A00]" />
              <span>Online</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-2.5 h-2.5 text-[#067647]" />
              <span>Local Stub</span>
            </>
          )}
        </span>
      )}
    </div>
  )
}
