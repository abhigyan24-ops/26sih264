import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUp, ArrowRight, Cpu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ScrollDock() {
  const [visible, setVisible] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      if (total > 0) {
        setScrollPct(Math.round((window.scrollY / total) * 100))
      }
      // Show dock after scrolling past 200px
      setVisible(window.scrollY > 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToId = (id: string) => {
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
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-4 sm:bottom-6 inset-x-0 mx-auto w-fit max-w-[calc(100vw-1.5rem)] z-40 pointer-events-auto"
        >
          <div
            className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-xl backdrop-blur-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderColor: '#DAD6CC',
              boxShadow: '0 12px 36px rgba(31, 58, 95, 0.16), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {/* National Identifier Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2 border-r border-[#DAD6CC] shrink-0">
              <img
                src="/favicon.svg"
                alt="CaseNexus"
                className="w-5 h-5 rounded-full shrink-0"
              />
              <span className="text-xs font-mono font-bold text-[#1F3A5F] hidden md:inline">
                CaseNexus
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1F3A5F]/10 text-[#1F3A5F]">
                {scrollPct}%
              </span>
            </div>

            {/* Quick Navigation Anchors (Desktop only) */}
            <div className="hidden lg:flex items-center gap-1 font-mono text-xs text-[#5B6068]">
              <button
                onClick={() => scrollToId('simulator')}
                className="px-2 py-1 rounded-md hover:bg-[#EFEDE7] hover:text-[#1F3A5F] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Cpu size={12} className="text-[#8A4B08]" />
                <span>Stress-Test</span>
              </button>
              <button
                onClick={() => scrollToId('interactive-layers')}
                className="px-2 py-1 rounded-md hover:bg-[#EFEDE7] hover:text-[#1F3A5F] transition-colors cursor-pointer"
              >
                Architecture
              </button>
              <button
                onClick={() => scrollToId('personas')}
                className="px-2 py-1 rounded-md hover:bg-[#EFEDE7] hover:text-[#1F3A5F] transition-colors cursor-pointer"
              >
                Roles
              </button>
              <button
                onClick={() => scrollToId('metrics')}
                className="px-2 py-1 rounded-md hover:bg-[#EFEDE7] hover:text-[#1F3A5F] transition-colors cursor-pointer"
              >
                Metrics
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#DAD6CC] hidden lg:block" />

            {/* Scroll to Top */}
            <button
              onClick={scrollToTop}
              className="p-1.5 rounded-full hover:bg-[#EFEDE7] text-[#5B6068] hover:text-[#1F3A5F] transition-colors cursor-pointer shrink-0"
              title="Smooth scroll to top"
              aria-label="Scroll to top"
            >
              <ArrowUp size={14} />
            </button>

            {/* Launch Prototype CTA */}
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#1F3A5F] hover:bg-[#17304F] transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
            >
              <span>Launch Prototype</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
