import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

const DIFFERENTIATORS = [
  {
    num: '01',
    title: 'Two-question engine',
    body: 'Same institution? Same issue? Answered separately by different methods — combined into a calibrated overlap score.',
  },
  {
    num: '02',
    title: 'Explainable alerts',
    body: 'Every flag shows which of six signals raised or lowered the score. Officers see the reasoning, not just a verdict.',
  },
  {
    num: '03',
    title: 'Learned thresholds',
    body: 'High-level precision target: 0.90. Every parameter stored in a registry with its origin, derivation and metrics.',
  },
  {
    num: '04',
    title: 'Coordination actions',
    body: 'Link · Lead · Hold · Dismiss. Each dismissal with a required reason becomes a training label for the next model version.',
  },
  {
    num: '05',
    title: 'Pre-action banner',
    body: 'Before an officer acts, the system shows every other active case at the same institution — preventing blind action.',
  },
  {
    num: '06',
    title: 'Privacy switch',
    body: 'Online/Offline mode enforced per-capability and per-case. Every external call logged to an immutable egress ledger.',
  },
  {
    num: '07',
    title: 'Multilingual',
    body: '50-language sentence model. Word-level diff with Unicode conjunct support for Devanagari and other scripts.',
  },
]

export default function DifferentiatorCards() {
  const headerRef = useRef(null)
  const gridRef = useRef(null)
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' })
  const gridInView = useInView(gridRef, { once: true, margin: '-60px' })
  const prefersReduced = useReducedMotion()

  return (
    <section
      aria-label="What makes CaseNexus different"
      className="py-24"
      style={{ background: '#F6F5F1', borderTop: '1px solid #DAD6CC' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="mb-12"
        >
          <span
            className="text-xs font-mono uppercase tracking-widest mb-3 block"
            style={{ color: '#8A4B08', fontFamily: '"IBM Plex Mono", monospace' }}
          >
            Differentiators
          </span>
          <h2
            className="text-3xl font-semibold leading-tight mb-3"
            style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Sans", sans-serif' }}
          >
            Beyond a plain dashboard.
          </h2>
          <p className="text-base max-w-2xl" style={{ color: '#5B6068' }}>
            Seven design decisions that separate CaseNexus from a generic case list.
          </p>
        </motion.div>

        {/* 3-column card grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {DIFFERENTIATORS.map((item, i) => (
            <motion.div
              key={item.num}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              animate={gridInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.06 }}
              className="relative flex flex-col gap-3 p-6 rounded-[6px] overflow-hidden"
              style={{
                background: '#FFFFFF',
                border: '1px solid #DAD6CC',
                borderLeft: '4px solid #1F3A5F',
              }}
            >
              {/* Large faded background number */}
              <span
                aria-hidden="true"
                className="absolute top-4 right-4 font-mono font-light leading-none select-none pointer-events-none"
                style={{
                  fontSize: 48,
                  color: '#DAD6CC',
                  fontFamily: '"IBM Plex Mono", monospace',
                  lineHeight: 1,
                }}
              >
                {item.num}
              </span>

              <p
                className="text-base font-semibold leading-snug relative z-10"
                style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Sans", sans-serif' }}
              >
                {item.title}
              </p>
              <p
                className="text-sm leading-relaxed relative z-10"
                style={{ color: '#5B6068', fontFamily: '"IBM Plex Sans", sans-serif' }}
              >
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
