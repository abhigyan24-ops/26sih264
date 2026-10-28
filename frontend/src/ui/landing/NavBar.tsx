import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronRight,
  Menu,
  X,
  Cpu,
  GitMerge,
  Users,
  CheckCircle2,
  TrendingUp,
  Layers,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'

const NAV_LINKS = [
  { id: 'pipeline', label: 'Pipeline', icon: GitMerge, desc: '8-step intake & active learning' },
  { id: 'interactive-layers', label: 'Architecture', icon: Layers, desc: '4-layer coordination engine' },
  { id: 'simulator', label: 'Simulator', icon: Cpu, desc: 'AICTE caseload stress-tester' },
  { id: 'personas', label: 'Roles', icon: Users, desc: 'RB, PGRC, Regional & Admin desks' },
  { id: 'problem', label: 'Problem', icon: AlertCircle, desc: 'Siloed bureau breakdown' },
  { id: 'features', label: 'Features', icon: CheckCircle2, desc: 'All 8 PS requirements' },
  { id: 'metrics', label: 'Metrics', icon: TrendingUp, desc: 'PR-AUC 0.9366 & Lok Sabha stats' },
]

export default function NavBar() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      const navOffset = 64
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = el.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - navOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-all duration-200"
        style={{
          background: scrolled
            ? 'rgba(246,245,241,0.97)'
            : 'rgba(246,245,241,0.92)',
          borderBottom: scrolled ? '1px solid #DAD6CC' : '1px solid rgba(218,214,204,0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-2 group cursor-pointer text-left shrink-0"
            aria-label="CaseNexus home"
          >
            <img
              src="/favicon.svg"
              alt="CaseNexus Logo"
              className="w-8 h-8 rounded-lg flex-shrink-0 shadow-xs transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span
                className="text-base font-bold tracking-tight leading-none"
                style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Sans", sans-serif' }}
              >
                CaseNexus
              </span>
              <span
                className="text-[9px] font-mono text-[#8A4B08] font-semibold tracking-wider uppercase hidden xs:block"
                style={{ fontFamily: '"IBM Plex Mono", monospace' }}
              >
                AICTE Nerve-Center
              </span>
            </div>
            <span
              className="hidden lg:inline text-[11px] font-mono px-2 py-0.5 rounded border ml-1"
              style={{
                color: '#5B6068',
                borderColor: '#DAD6CC',
                background: '#EFEDE7',
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              SIH26264 · Mutexia
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <div className="hidden xl:flex items-center gap-1 font-medium text-xs text-[#5B6068]">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className="px-2.5 py-1.5 rounded-md hover:bg-[#EFEDE7] hover:text-[#1F3A5F] transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Launch Prototype CTA */}
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer shadow-xs"
              style={{
                background: '#1F3A5F',
                color: '#E8EDF3',
                border: '1px solid #1F3A5F',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#17304F'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#1F3A5F'
              }}
            >
              <span>Launch Prototype</span>
              <ChevronRight size={14} />
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg border border-[#DAD6CC] bg-white/80 text-[#1F3A5F] hover:bg-[#EFEDE7] transition-colors cursor-pointer xl:hidden flex items-center justify-center"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 xl:hidden"
            style={{ background: 'rgba(20, 35, 58, 0.45)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute top-14 inset-x-0 bg-[#F6F5F1] border-b border-[#DAD6CC] shadow-2xl max-h-[calc(100vh-3.5rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 space-y-4">
                {/* Statutory Identity Pill */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#DAD6CC] shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-[#1F3A5F]">
                      SIH 2026 · PS SIH26264
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#8A4B08] font-semibold bg-[#FFF3E0] px-2 py-0.5 rounded border border-[#FCD299]">
                    Team Mutexia
                  </span>
                </div>

                {/* Navigation Links Grid */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#5B6068] font-bold px-1">
                    System Architecture & Demos
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {NAV_LINKS.map((link) => {
                      const Icon = link.icon
                      return (
                        <button
                          key={link.id}
                          onClick={() => handleNavClick(link.id)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#DAD6CC] hover:border-[#1F3A5F] active:bg-[#EFEDE7] text-left transition-colors group cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC] flex items-center justify-center text-[#1F3A5F] group-hover:bg-[#1F3A5F] group-hover:text-white transition-colors">
                              <Icon size={16} />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-[#1B1F24] group-hover:text-[#1F3A5F]">
                                {link.label}
                              </div>
                              <div className="text-[11px] text-[#5B6068]">
                                {link.desc}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-[#8C8A82] group-hover:text-[#1F3A5F]" />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Mobile Secondary Action */}
                <div className="pt-2 border-t border-[#DAD6CC]">
                  <button
                    onClick={() => handleNavClick('tech-stack')}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[#DAD6CC] bg-white text-[#5B6068] hover:text-[#1F3A5F] text-xs font-medium cursor-pointer"
                  >
                    <Layers size={15} />
                    <span>View Technical Architecture</span>
                  </button>
                </div>

                {/* Launch Prototype Action Button */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/login')
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1F3A5F] text-white font-semibold text-sm shadow-md active:scale-98 transition-transform cursor-pointer"
                >
                  <span>Launch Prototype</span>
                  <ArrowRight size={15} />
                </button>

                {/* Footer Attribution in Drawer */}
                <p className="text-[10px] text-center font-mono text-[#8C8A82] pt-1">
                  Air-Gapped Sovereign AICTE Regulatory Coordination Node
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
