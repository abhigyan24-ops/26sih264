import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Award } from 'lucide-react'

export default function LandingFooter() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const prefersReduced = useReducedMotion()

  return (
    <footer
      ref={ref}
      aria-label="Site footer"
      style={{ background: '#14233A' }}
    >
      <motion.div
        initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      >
        {/* Main footer body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {/* Left: identity */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/favicon.svg"
                  alt="CaseNexus Logo"
                  className="w-8 h-8 rounded-lg flex-shrink-0 border border-white/20 shadow-xs"
                />
                <span
                  className="text-base font-semibold"
                  style={{ color: '#E8EDF3', fontFamily: '"IBM Plex Sans", sans-serif' }}
                >
                  CaseNexus
                </span>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: '#A9B6C6', fontFamily: '"IBM Plex Sans", sans-serif' }}
              >
                Problem Statement ID: SIH26264
                <br />
                Team Mutexia · Theme: Smart Automation
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono px-2.5 py-1 rounded self-start flex items-center gap-1.5"
                  style={{
                    color: '#FFD180',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >
                  <Award size={12} />
                  Smart India Hackathon 2026
                </span>
              </div>
            </div>

            {/* Center: statutory proposition */}
            <div className="flex flex-col justify-center space-y-2">
              <span className="text-xs font-mono text-[#81C784] uppercase tracking-wider font-semibold">
                Core Governance Charter
              </span>
              <p
                className="text-sm italic leading-relaxed"
                style={{ color: '#A9B6C6', fontFamily: '"IBM Plex Sans", sans-serif' }}
              >
                "1 Institution = 1 Coordinated Action. The system suggests; officers decide. Explainable, CPU-only, and fully air-gapped sovereign execution."
              </p>
            </div>

            {/* Right: authority */}
            <div className="flex flex-col items-start md:items-end justify-center gap-2">
              <p
                className="text-sm text-left md:text-right leading-relaxed"
                style={{ color: '#E8EDF3', fontFamily: '"IBM Plex Sans", sans-serif' }}
              >
                All India Council for Technical Education (AICTE)
                <br />
                <span style={{ color: '#A9B6C6' }}>Ministry of Education, Government of India</span>
              </p>
              <p
                className="text-xs text-left md:text-right font-mono text-[#8C8A82]"
                style={{ fontFamily: '"IBM Plex Mono", monospace' }}
              >
                Designed for Regulation Bureau (RB), PGRC &amp; Regional Offices
              </p>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className="px-4 sm:px-6 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p
              className="text-xs font-mono"
              style={{ color: '#A9B6C6', fontFamily: '"IBM Plex Mono", monospace' }}
            >
              © 2026 CaseNexus · Team Mutexia · PS SIH26264
            </p>
            <p
              className="text-xs font-mono"
              style={{ color: '#81C784', fontFamily: '"IBM Plex Mono", monospace' }}
            >
              114/114 Tests Passing · Zero External Cloud Dependencies
            </p>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}
