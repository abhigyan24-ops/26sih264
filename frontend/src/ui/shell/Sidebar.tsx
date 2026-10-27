import type { ElementType } from 'react'
import { NavLink } from 'react-router-dom'
import { Shield, Menu, X, LogOut } from 'lucide-react'
import { cn } from '../utils'

export interface NavItem {
  to: string
  icon: ElementType
  label: string
  exact?: boolean
  badge?: boolean
  adminOnly?: boolean
}

export interface NavGroup {
  group: string
  items: NavItem[]
}

export interface SidebarProps {
  open: boolean
  onToggle: () => void
  navGroups: NavGroup[]
  unreadAlerts: number
  isAdminOrManagement: boolean
  displayName: string
  role: string
  bureauCode: string
  onLogout: () => void
}

export function Sidebar({
  open,
  onToggle,
  navGroups,
  unreadAlerts,
  isAdminOrManagement,
  displayName,
  role,
  bureauCode,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col bg-[#14233A] border-r border-[#1F3A5F]/50 transition-all duration-200 shrink-0 select-none z-30',
        open ? 'w-64' : 'w-16'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3.5 h-12 border-b border-[#1F3A5F]/60">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-[4px] bg-[#1F3A5F] border border-[#2A4D7C] flex items-center justify-center shrink-0 shadow-sm">
            <Shield className="w-4 h-4 text-[#E8EDF3]" />
          </div>
          {open && (
            <div className="leading-tight truncate">
              <div className="font-sans font-semibold text-xs text-[#E8EDF3] tracking-tight">
                AICTE CaseNexus
              </div>
              <div className="text-[10px] font-mono text-[#A9B6C6] uppercase tracking-wider">
                Civic Ledger v2.1
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="text-[#A9B6C6] hover:text-[#E8EDF3] transition-colors p-1 rounded hover:bg-[#1F3A5F]/40"
          aria-label={open ? 'Collapse sidebar navigation' : 'Expand sidebar navigation'}
        >
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {navGroups.map(({ group, items }) => {
          const filteredItems = items.filter(
            ({ adminOnly }) => !adminOnly || isAdminOrManagement
          )
          if (filteredItems.length === 0) return null

          return (
            <div key={group} className="space-y-1">
              {open && (
                <div className="px-2.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#A9B6C6]/80">
                  {group}
                </div>
              )}
              {filteredItems.map(({ to, icon: Icon, label, exact, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-[#1F3A5F] text-[#FFFFFF] font-semibold shadow-sm'
                        : 'text-[#A9B6C6] hover:text-[#E8EDF3] hover:bg-[#1E3352]/50',
                      !open && 'justify-center px-0'
                    )
                  }
                  title={!open ? label : undefined}
                >
                  <div className="relative shrink-0">
                    <Icon className="w-4 h-4" />
                    {badge && unreadAlerts > 0 && !open && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#B42318] rounded-full text-[8px] flex items-center justify-center text-white font-mono font-bold">
                        •
                      </span>
                    )}
                  </div>
                  {open && <span className="truncate">{label}</span>}
                  {open && badge && unreadAlerts > 0 && (
                    <span className="ml-auto bg-[#FDECEA] text-[#B42318] border border-[#F8B7B2] text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-[4px]">
                      {unreadAlerts}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Officer Account & Sign Out */}
      <div className="border-t border-[#1F3A5F]/60 p-2.5 bg-[#101C2E]">
        <div className={cn('flex items-center gap-2.5', !open && 'justify-center')}>
          <div className="w-7 h-7 rounded-[4px] bg-[#1F3A5F] border border-[#2A4D7C] flex items-center justify-center text-[#E8EDF3] shrink-0 font-mono text-xs font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {open && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#E8EDF3] truncate">
                {displayName}
              </div>
              <div className="text-[10px] font-mono text-[#A9B6C6] uppercase truncate">
                {role} {bureauCode ? `· ${bureauCode}` : ''}
              </div>
            </div>
          )}
          {open && (
            <button
              type="button"
              onClick={onLogout}
              className="text-[#A9B6C6] hover:text-[#B42318] p-1 transition-colors rounded hover:bg-[#1F3A5F]/40"
              title="Sign out of portal"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
