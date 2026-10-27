import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ChevronRight } from 'lucide-react'

export default function NavBar() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all duration-200"
      style={{
        background: scrolled
          ? 'rgba(246,245,241,0.97)'
          : 'rgba(246,245,241,0.92)',
        borderBottom: scrolled ? '1px solid #DAD6CC' : '1px solid transparent',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 group"
          aria-label="CaseNexus home"
        >
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: '#1F3A5F' }}
          >
            <Shield size={16} className="text-white" />
          </div>
          <span
            className="text-base font-semibold tracking-tight"
            style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Sans", sans-serif' }}
          >
            CaseNexus
          </span>
          <span
            className="hidden sm:inline text-xs font-mono px-2 py-0.5 rounded border"
            style={{
              color: '#5B6068',
              borderColor: '#DAD6CC',
              background: '#EFEDE7',
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          >
            SIH26264 · Team Mutexia
          </span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span
            className="hidden md:inline text-xs"
            style={{ color: '#5B6068' }}
          >
            Smart India Hackathon 2026 · AICTE
          </span>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded transition-colors duration-150"
            style={{
              background: '#1F3A5F',
              color: '#E8EDF3',
              border: '1px solid #1F3A5F',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#17304F'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#1F3A5F'
            }}
          >
            Login
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
}
