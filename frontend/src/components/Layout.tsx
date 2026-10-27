import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, FileText, Link2, Bell,
  Settings, LogOut, ChevronRight, Menu, X, Shield,
  Search, BarChart2
} from 'lucide-react'
import { getAlerts, searchInstitutions, me, logout } from '../lib/api'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/cases', icon: FileText, label: 'Cases' },
  { to: '/overlaps', icon: Link2, label: 'Review overlaps' },
  { to: '/alerts', icon: Bell, label: 'Alerts', badge: true },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/admin', icon: Settings, label: 'Admin', adminOnly: true },
]

export default function Layout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch user from /api/auth/me so top bar always reflects server state
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    staleTime: Infinity,
    retry: false,
  })

  // BEGIN ALERT BADGE SLOT (T20)
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: () => getAlerts(true),
    refetchInterval: 15_000,
  })
  const unread = alerts.length
  // END ALERT BADGE SLOT (T20)

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
        setSearchModalOpen(prev => !prev)
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
  const displayName = user?.full_name ?? user?.username ?? '—'

  const handleLogout = () => logout()

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside className={`${open ? 'w-60' : 'w-16'} flex flex-col bg-surface-secondary border-r border-slate-800/60 transition-all duration-300 shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/60">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          {open && (
            <div className="animate-fade-in">
              <div className="font-bold text-sm gradient-text">CaseNexus</div>
              <div className="text-xs text-slate-500">AICTE Dashboard</div>
            </div>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV.filter(({ adminOnly }) => !adminOnly || isAdminOrManagement).map(({ to, icon: Icon, label, exact, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <div className="relative shrink-0">
                <Icon size={18} />
                {badge && unread > 0 && !open && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              {open && <span className="animate-fade-in">{label}</span>}
              {open && badge && unread > 0 && (
                <span className="ml-auto bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-1.5 py-0.5 rounded-full animate-fade-in">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-slate-800/60 p-3">
          <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${open ? '' : 'justify-center'}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {open && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <div className="text-xs font-medium text-slate-300 truncate">{displayName}</div>
                <div className="text-xs text-slate-500 capitalize">{role}</div>
              </div>
            )}
            {open && (
              <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition-colors animate-fade-in" title="Logout">
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-800/60 bg-surface-secondary/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          {/* Global search trigger */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all text-xs w-72"
          >
            <Search size={14} className="text-slate-500" />
            <span>Search institutions or cases...</span>
            <kbd className="ml-auto text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400">Ctrl K</kbd>
          </button>

          <div className="flex items-center gap-4">
            {/* ── Stage 9 mode bar slot ────────────────────────────────────
                This space is reserved for the offline/online mode bar added in Stage 9.
                Do NOT render any mode or connectivity status here until Stage 9.
            ──────────────────────────────────────────────────────────────── */}

            {/* Header Bell Notification Icon (T20) */}
            <NavLink
              to="/alerts"
              className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800/50"
              title="Alerts"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center rounded-full animate-pulse">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </NavLink>

            {/* User info in top bar */}
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-xs font-medium text-slate-300">{displayName}</span>
              <span className="text-xs text-slate-500 capitalize">{role}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors px-2 py-1 rounded-md border border-transparent hover:border-rose-500/20"
              title="Logout"
              id="top-bar-logout"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Quick Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-xl overflow-hidden border border-slate-700 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
              <Search size={18} className="text-slate-500" />
              <input
                autoFocus
                className="bg-transparent border-0 outline-none text-slate-100 text-sm flex-1 placeholder:text-slate-500"
                placeholder="Type institution name, city, or AICTE ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xs px-1.5 py-0.5 border border-slate-700 rounded"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {searchQuery.trim().length < 2 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Type at least 2 characters to search institutions across AICTE bureaus.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
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
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/80 cursor-pointer transition-colors group"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                          {inst.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-blue-400/80">{inst.aicte_permanent_id}</span>
                          <span>&bull;</span>
                          <span>{inst.city || 'N/A'}, {inst.region}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-300 transition-colors shrink-0" />
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
