import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  FileText,
  Link2,
  Bell,
  Settings,
  BarChart3,
  Upload,
} from 'lucide-react'
import { getAlerts, searchInstitutions, me, logout } from '../lib/api'
import { Sidebar, TopBar, QuickSearchModal, type NavGroup } from '../ui/shell'

const NAV_GROUPS: NavGroup[] = [
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    staleTime: Infinity,
    retry: false,
  })

  // Alerts unread polling remains invariant: 15s interval
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: () => getAlerts(true),
    refetchInterval: 15_000,
  })
  const unreadCount = alerts.length

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
    <div className="flex h-screen overflow-hidden bg-[#F6F5F1] text-[#1B1F24]">
      {/* Civic Ledger Sidebar Navigation */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        navGroups={NAV_GROUPS}
        unreadAlerts={unreadCount}
        isAdminOrManagement={isAdminOrManagement}
        displayName={displayName}
        role={role}
        bureauCode={bureauCode}
        onLogout={handleLogout}
      />

      {/* Main Operational Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F6F5F1]">
        {/* Top Header */}
        <TopBar
          onOpenSearch={() => setSearchModalOpen(true)}
          unreadAlerts={unreadCount}
          isAdmin={role === 'admin'}
          onLogout={handleLogout}
        />

        {/* Content Outlet with Opacity Page Transition */}
        <main className="flex-1 overflow-y-auto transition-opacity duration-200">
          <Outlet />
        </main>
      </div>

      {/* Global Quick Search Modal (Ctrl+K) */}
      <QuickSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        results={searchResults}
        onSelectInstitution={(instId) => {
          navigate(`/institutions/${instId}`)
          setSearchModalOpen(false)
          setSearchQuery('')
        }}
      />
    </div>
  )
}
