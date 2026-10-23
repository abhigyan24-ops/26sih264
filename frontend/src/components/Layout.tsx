import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, FileText, Link2, Bell, Building2,
  Settings, LogOut, ChevronRight, Menu, X, Shield
} from 'lucide-react'
import { getAlerts } from '../lib/api'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/cases', icon: FileText, label: 'Cases' },
  { to: '/overlaps', icon: Link2, label: 'Overlaps' },
  { to: '/alerts', icon: Bell, label: 'Alerts', badge: true },
  { to: '/admin', icon: Settings, label: 'Admin' },
]

export default function Layout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: () => getAlerts(true),
    refetchInterval: 30_000,
  })
  const unread = (alerts as any[]).length

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

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
          {NAV.map(({ to, icon: Icon, label, exact, badge }) => (
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
              {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
            </div>
            {open && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <div className="text-xs font-medium text-slate-300 truncate">{user.full_name || user.username}</div>
                <div className="text-xs text-slate-500 capitalize">{user.role}</div>
              </div>
            )}
            {open && (
              <button onClick={logout} className="text-slate-500 hover:text-rose-400 transition-colors animate-fade-in" title="Logout">
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
