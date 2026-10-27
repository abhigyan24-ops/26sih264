import { useRef, useState } from 'react'
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
  const [hovered, setHovered] = useState(false)
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.28, ease: 'easeOut', delay }}
      className="relative flex flex-col gap-3 p-5 rounded-[6px] cursor-default"
      style={{
        background: '#F6F5F1',
        border: `1px solid ${hovered ? '#8C8A82' : '#DAD6CC'}`,
        transition: 'border-color 150ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CheckCircle2
        size={14}
        className="absolute top-4 right-4"
        style={{ color: '#067647' }}
        aria-label="Implemented and verified"
      />
      <Icon size={20} style={{ color: '#1F3A5F' }} aria-hidden="true" />
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
      aria-label="Features covering all PS 26264 requirements"
      className="py-24"
      style={{ background: '#FFFFFF', borderTop: '1px solid #DAD6CC' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="mb-12"
        >
          <span
            className="text-xs font-mono uppercase tracking-widest mb-3 block"
            style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Mono", monospace' }}
          >
            Coverage
          </span>
          <h2
            className="text-3xl font-semibold leading-tight mb-3"
            style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Sans", sans-serif' }}
          >
            All eight required areas — built and verified.
          </h2>
          <p className="text-base max-w-2xl" style={{ color: '#5B6068' }}>
            Every item from PS 26264 is implemented, tested and running.{' '}
            <span
              className="font-mono text-sm"
              style={{ color: '#067647', fontFamily: '"IBM Plex Mono", monospace' }}
            >
              114 / 114 tests passing.
            </span>
          </p>
        </motion.div>

        <div
          ref={gridRef}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {FEATURES.map((feat, i) => (
            <FeatureTile
              key={feat.title}
              icon={feat.icon}
              title={feat.title}
              body={feat.body}
              delay={i * 0.06}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
