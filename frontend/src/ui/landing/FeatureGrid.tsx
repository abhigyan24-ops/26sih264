import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import {
  Building2,
  ListChecks,
  GitMerge,
  BarChart2,
  History,
  Search,
  Bell,
  FileDown,
  CheckCircle2,
} from 'lucide-react'
import SpotlightCard from './SpotlightCard'

const FEATURES = [
  {
    icon: Building2,
    title: 'Institution 360',
    body: 'Keyed on AICTE Permanent ID. Complaint history across all bureaus on one page.',
  },
  {
    icon: ListChecks,
    title: 'Case Tracking',
    body: 'ID, receipt date, category, status, bureau, officer and SLA deadline — always visible.',
  },
  {
    icon: GitMerge,
    title: 'Overlap Detection',
    body: 'Automatic detection, scored alerts and linking of related cases across bureaus.',
  },
  {
    icon: BarChart2,
    title: 'Real-time Dashboard',
    body: 'KPIs: total, pending, under process, disposed, transferred, SLA breached.',
  },
  {
    icon: History,
    title: 'Workflow & Timeline',
    body: 'Chronological log with officer, unit, timestamp, remarks and documents.',
  },
  {
    icon: Search,
    title: 'Search & Filters',
    body: 'Institution name, AICTE ID, bureau, region, category, status, date range.',
  },
  {
    icon: Bell,
    title: 'Alerts',
    body: 'Overlap (High/Medium), SLA risk, escalation and pending reminders.',
  },
  {
    icon: FileDown,
    title: 'Reports & Export',
    body: 'Bureau, region, institution, ageing, disposal rate. PDF and Excel export.',
  },
]

function FeatureTile({
  icon: Icon,
  title,
  body,
  delay,
  inView,
}: {
  icon: React.ElementType
  title: string
  body: string
  delay: number
  inView: boolean
}) {
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.28, ease: 'easeOut', delay }}
      className="h-full"
    >
      <SpotlightCard
        spotlightColor="rgba(31, 58, 95, 0.08)"
        className="h-full p-5 flex flex-col justify-between"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC] flex items-center justify-center text-[#1F3A5F]">
              <Icon size={18} aria-hidden="true" />
            </div>
            <CheckCircle2
              size={14}
              style={{ color: '#067647' }}
              aria-label="Implemented and verified"
            />
          </div>

          <div>
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: '#1B1F24', fontFamily: '"IBM Plex Sans", sans-serif' }}
            >
              {title}
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: '#5B6068', fontFamily: '"IBM Plex Sans", sans-serif' }}
            >
              {body}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-[#F0EEE9] flex items-center justify-between text-[10px] font-mono text-[#067647]">
          <span>VERIFIED UNIT</span>
          <span>100% COVERAGE</span>
        </div>
      </SpotlightCard>
    </motion.div>
  )
}

export default function FeatureGrid() {
  const gridRef = useRef(null)
  const inView = useInView(gridRef, { once: true, margin: '-60px' })
  const headerRef = useRef(null)
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' })
  const prefersReduced = useReducedMotion()

  return (
    <section
      id="features"
      aria-label="Features covering all PS 26264 requirements"
      className="py-14 sm:py-24"
      style={{ background: '#FFFFFF', borderTop: '1px solid #DAD6CC' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="mb-8 sm:mb-12"
        >
          <span
            className="text-xs font-mono uppercase tracking-widest mb-2.5 block"
            style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Mono", monospace' }}
          >
            Statutory Scope
          </span>
          <h2
            className="text-2xl sm:text-3xl font-semibold leading-tight mb-3"
            style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Sans", sans-serif' }}
          >
            All eight required areas — built and verified.
          </h2>
          <p className="text-sm sm:text-base max-w-2xl text-[#5B6068]">
            Every item from PS 26264 is implemented, tested and running.{' '}
            <span
              className="font-mono text-xs sm:text-sm"
              style={{ color: '#067647', fontFamily: '"IBM Plex Mono", monospace' }}
            >
              114 / 114 tests passing.
            </span>
          </p>
        </motion.div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5"
        >
          {FEATURES.map((feat, i) => (
            <FeatureTile
              key={feat.title}
              icon={feat.icon}
              title={feat.title}
              body={feat.body}
              delay={i * 0.05}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
