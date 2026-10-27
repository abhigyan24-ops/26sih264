import ModeBar from './ModeBar'
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  FileText,
  Link2,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Shield,
  Search,
  BarChart3,
  Upload,
} from 'lucide-react'
import { getAlerts, searchInstitutions, me, logout } from '../lib/api'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  exact?: boolean
  badge?: boolean
  adminOnly?: boolean
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Operations',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { to: '/cases', icon: FileText, label: 'Grievance Cases' },
      { to: '/overlaps', icon: Link2, label: 'Review Overlaps' },
      { to: '/alerts', icon: Bell, label: 'Alerts & Actions', badge: true },
      { to: '/import', icon: Upload, label: 'Data Ingestion' },
    ],
  },
  {
    group: 'Analytics',
    items: [{ to: '/reports', icon: BarChart3, label: 'Reports & Analytics' }],
  },
  {
    group: 'Administration',
    items: [{ to: '/admin', icon: Settings, label: 'System Administration', adminOnly: true }],
  },
]

export default function Layout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    staleTime: Infinity,
    retry: false,
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: () => getAlerts(true),
    refetchInterval: 15_000,
  })
  const unread = alerts.length

  const { data: searchResults = [] } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: () => searchInstitutions(searchQuery),
    enabled: searchQuery.trim().length >= 2,
  })

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchModalOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const role = user?.role ?? ''
  const isAdminOrManagement = role === 'admin' || role === 'management'
  const displayName = user?.full_name ?? user?.username ?? 'Officer'
  const bureauCode = user?.region ?? (user?.bureau_id ? `Bureau #${user.bureau_id}` : '')

  const handleLogout = () => logout()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <aside
        className={`${
          open ? 'w-64' : 'w-14'
        } flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200 shrink-0 select-none`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between px-3.5 h-12 border-b border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-6 h-6 rounded bg-blue-700 flex items-center justify-center shrink-0">
              <Shield size={14} className="text-white" />
            </div>
            {open && (
              <div className="leading-tight truncate">
                <div className="font-mono font-bold text-xs text-slate-100 tracking-tight">
                  AICTE CaseNexus
                </div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Grievance Monitoring
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {open ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>

        {/* Grouped Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map(({ group, items }) => {
            const filteredItems = items.filter(
              ({ adminOnly }) => !adminOnly || isAdminOrManagement
            )
            if (filteredItems.length === 0) return null

            return (
              <div key={group} className="space-y-1">
                {open && (
                  <div className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {group}
                  </div>
                )}
                {filteredItems.map(({ to, icon: Icon, label, exact, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'active' : ''} ${
                        !open ? 'justify-center px-0' : ''
                      }`
                    }
                    title={!open ? label : undefined}
                  >
                    <div className="relative shrink-0">
                      <Icon size={16} />
                      {badge && unread > 0 && !open && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-600 rounded-full text-[8px] flex items-center justify-center text-white font-mono font-bold">
                          {unread > 9 ? '•' : unread}
                        </span>
                      )}
                    </div>
                    {open && <span className="truncate">{label}</span>}
                    {open && badge && unread > 0 && (
                      <span className="ml-auto bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded">
                        {unread}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* User Card & Logout at Bottom */}
        <div className="border-t border-slate-800 p-2.5 bg-slate-900/90">
          <div className={`flex items-center gap-2.5 ${open ? '' : 'justify-center'}`}>
            <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 font-mono text-xs font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate">{displayName}</div>
                <div className="text-[10px] font-mono text-slate-400 uppercase truncate">
                  {role} {bureauCode ? `· ${bureauCode}` : ''}
                </div>
              </div>
            )}
            {open && (
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 p-1 transition-colors rounded hover:bg-slate-800"
                title="Sign out of portal"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Operational Surface */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        {/* Compact Top Header */}
        <header className="h-12 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between shrink-0 text-xs">
          {/* Global Quick Search Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-2.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors w-64 text-left"
          >
            <Search size={13} className="text-slate-500" />
            <span className="truncate">Search institution or case...</span>
            <kbd className="ml-auto text-[10px] font-mono bg-slate-900 border border-slate-700 px-1 py-0.5 rounded text-slate-400">
              Ctrl K
            </kbd>
          </button>

          {/* Right Header Area */}
          <div className="flex items-center gap-3">
            <ModeBar isAdmin={role === 'admin'} />

            {/* Notification Bell with Badge */}
            <NavLink
              to="/alerts"
              className="relative p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="View system alerts"
            >
              <Bell size={15} />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-rose-600 text-white font-mono font-bold text-[8px] flex items-center justify-center rounded-full">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </NavLink>

            {/* Top Bar Logout Action */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors px-2 py-1 rounded border border-transparent hover:border-slate-800"
              title="Sign out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline font-medium">Exit</span>
            </button>
          </div>
        </header>

        {/* Main Content Router Outlet */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Quick Search Modal (Ctrl+K) */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-black/80 animate-fade-in">
          <div className="panel bg-slate-900 border border-slate-700 w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-800 bg-slate-950">
              <Search size={16} className="text-slate-500" />
              <input
                autoFocus
                className="bg-transparent border-0 outline-none text-slate-100 text-xs flex-1 placeholder:text-slate-500 font-mono"
                placeholder="Type institution name, city, or AICTE permanent ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 font-mono text-[10px] px-1.5 py-0.5 border border-slate-700 rounded"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 text-xs">
              {searchQuery.trim().length < 2 ? (
                <div className="p-6 text-center text-slate-500">
                  Type at least 2 characters to search institutions across AICTE jurisdictions.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  No matching institutions found for &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((inst: any) => (
                    <div
                      key={inst.id}
                      onClick={() => {
                        navigate(`/institutions/${inst.id}`)
                        setSearchModalOpen(false)
                        setSearchQuery('')
                      }}
                      className="flex items-center justify-between p-2.5 rounded hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-medium text-slate-200 truncate">
                          {inst.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
                          <span className="text-blue-400">{inst.aicte_permanent_id}</span>
                          <span>·</span>
                          <span>
                            {inst.city || 'N/A'}, {inst.region}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
