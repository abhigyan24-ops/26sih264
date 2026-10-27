import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, Bell, LogOut } from 'lucide-react'
import ModeBar from '../../components/ModeBar'

export interface TopBarProps {
  onOpenSearch: () => void
  unreadAlerts: number
  isAdmin: boolean
  onLogout: () => void
  children?: ReactNode
}

export function TopBar({
  onOpenSearch,
  unreadAlerts,
  isAdmin,
  onLogout,
  children,
}: TopBarProps) {
  return (
    <header className="h-12 border-b border-[#DAD6CC] bg-[#FFFFFF] px-4 flex items-center justify-between shrink-0 text-xs shadow-sm z-20">
      {/* Global Quick Search Button */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] bg-[#F6F5F1] border border-[#8C8A82] text-[#5B6068] hover:text-[#1B1F24] hover:border-[#1F3A5F] transition-colors w-60 sm:w-72 text-left"
        aria-label="Quick search institutions and cases (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 text-[#5B6068] shrink-0" />
        <span className="truncate text-xs">Search institution or case...</span>
        <kbd className="ml-auto text-[10px] font-mono bg-[#FFFFFF] border border-[#DAD6CC] px-1.5 py-0.5 rounded text-[#5B6068]">
          Ctrl K
        </kbd>
      </button>

      {/* Right Controls: ModeBar, Notification Bell, Logout */}
      <div className="flex items-center gap-3">
        {children}

        {/* Dynamic ModeBar (Privacy & Capabilities) */}
        <div className="hidden lg:block">
          <ModeBar isAdmin={isAdmin} />
        </div>

        {/* Notification Bell */}
        <NavLink
          to="/alerts"
          className="relative p-1.5 text-[#5B6068] hover:text-[#1B1F24] hover:bg-[#EFEDE7] rounded-[4px] transition-colors"
          title="View system alerts and actions"
          aria-label="View system alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadAlerts > 0 && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#B42318] text-white font-mono font-bold text-[8px] flex items-center justify-center rounded-full shadow-sm">
              {unreadAlerts > 99 ? '99+' : unreadAlerts}
            </span>
          )}
        </NavLink>

        {/* Exit Button */}
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 text-[#5B6068] hover:text-[#B42318] transition-colors px-2 py-1 rounded-[4px] border border-transparent hover:border-[#DAD6CC]"
          title="Sign out of portal"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium text-xs">Exit</span>
        </button>
      </div>
    </header>
  )
}
