import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { AlertCircle, ZapOff, Clock, UserX, BookX } from 'lucide-react'
import SpotlightCard from './SpotlightCard'

const CONSEQUENCES = [
  {
    icon: AlertCircle,
    title: 'Duplicated effort',
    description: 'Two officers from different units investigate the exact same allegation against the same institution — unaware of each other.',
  },
  {
    icon: ZapOff,
    title: 'Conflicting action',
    description: 'PGRC closes a grievance as resolved while RB simultaneously issues a notice on the same underlying issue.',
  },
  {
    icon: Clock,
    title: 'Delayed disposal',
    description: 'Cases wait while units search for each other\'s status. No shared channel means manual phone calls and emails.',
  },
  {
    icon: UserX,
    title: 'No ownership',
    description: 'No single answer to: "Who is currently handling this institution?" Three units could all say "we are."',
  },
  {
    icon: BookX,
    title: 'No institutional memory',
    description: 'Officers act without seeing earlier complaints. The same institution\'s pattern of violations stays invisible.',
  },
]

function RevealSection({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.32, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

export default function ProblemStrip() {
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section
      id="problem"
      aria-label="The problem CaseNexus solves"
      style={{
        background: '#FFFFFF',
        borderTop: '1px solid #DAD6CC',
        borderBottom: '1px solid #DAD6CC',
      }}
      className="py-14 sm:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <RevealSection>
          <div className="mb-10 sm:mb-12">
            <span
              className="text-xs font-mono uppercase tracking-widest mb-2.5 block"
              style={{ color: '#9A4A00', fontFamily: '"IBM Plex Mono", monospace' }}
            >
              The Root Cause
            </span>
            <h2
              className="text-2xl sm:text-3xl font-semibold leading-tight mb-3"
              style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Sans", sans-serif' }}
            >
              Several units. One institution. No shared view.
            </h2>
            <p className="text-sm sm:text-base max-w-2xl text-[#5B6068]">
              AICTE's Regulation Bureau, Public Grievance Redressal Cell, and Regional Offices
              each maintain their own records. When multiple units handle the same institution,
              coordination breaks down.
            </p>
          </div>
        </RevealSection>

        {/* Consequence cards with Spotlight */}
        <div
          ref={sectionRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4"
        >
          {CONSEQUENCES.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.28, ease: 'easeOut', delay: i * 0.07 }}
            >
              <SpotlightCard
                spotlightColor="rgba(180, 35, 24, 0.09)"
                borderColor="#F8B7B2"
                className="h-full p-4 sm:p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FDECEA] flex items-center justify-center text-[#B42318]">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{ color: '#1B1F24' }}
                    >
                      {title}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#5B6068' }}>
                      {description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-[#F8B7B2]/40 text-[10px] font-mono text-[#B42318] font-semibold">
                  STATUS: HIGH RISK
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
