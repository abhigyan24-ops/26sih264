import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUp, ArrowRight, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ScrollDock() {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      // Show dock after scrolling past 350px
      if (window.scrollY > 350) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-6 inset-x-0 mx-auto w-fit z-50 pointer-events-auto"
        >
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md"
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              borderColor: '#DAD6CC',
              boxShadow: '0 8px 30px rgba(31, 58, 95, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {/* National Identifier Badge */}
            <div className="flex items-center gap-2 pr-2 border-r border-[#DAD6CC]">
              <div className="w-5 h-5 rounded-full bg-[#1F3A5F] text-white flex items-center justify-center">
                <Shield size={11} />
              </div>
              <span className="text-xs font-mono font-bold text-[#1F3A5F] hidden sm:inline">
                CaseNexus · SIH26264
              </span>
            </div>

            {/* Scroll to Top */}
            <button
              onClick={scrollToTop}
              className="p-1.5 rounded-full hover:bg-[#EFEDE7] text-[#5B6068] hover:text-[#1F3A5F] transition-colors cursor-pointer"
              title="Smooth scroll to top"
              aria-label="Scroll to top"
            >
              <ArrowUp size={15} />
            </button>

            {/* Launch Prototype CTA */}
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#1F3A5F] hover:bg-[#17304F] transition-all active:scale-95 cursor-pointer shadow-xs"
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
