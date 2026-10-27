import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { TrendingDown, ShieldCheck, Zap, Database } from 'lucide-react'

const METRICS = [
  {
    value: '0.9366',
    label: 'PR-AUC Score',
    sub: 'ML overlap detection vs 0.6749 cosine baseline',
    icon: Zap
  },
  {
    value: '120 Days',
    label: 'Officer-Days Saved',
    sub: 'Estimated per 1,000 complaints via duplicate avoidance',
    icon: TrendingDown
  },
  {
    value: '30 → 21d',
    label: 'Redressal Target',
    sub: 'Aligned with DARPG Central grievance guidelines',
    icon: Database
  },
  {
    value: '100%',
    label: 'Offline CPU-Only',
    sub: '384-dim ONNX vector model with zero cloud leak',
    icon: ShieldCheck
  },
]

export default function MetricsBar() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const prefersReduced = useReducedMotion()

  return (
    <section
      ref={ref}
      aria-label="Verified prototype metrics and governance impact"
      className="py-20 relative overflow-hidden"
      style={{ background: '#1F3A5F' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="text-center mb-12 space-y-1.5"
        >
          <span
            className="text-xs font-mono uppercase tracking-widest text-[#FFD180] font-semibold block"
            style={{ fontFamily: '"IBM Plex Mono", monospace' }}
          >
            Empirical Benchmark & National Scale
          </span>
          <p className="text-sm text-[#A9B6C6]">
            Benchmarked against AICTE case parameters and official Lok Sabha grievance statistics
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {METRICS.map((metric, i) => {
            const Icon = metric.icon
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.08 }}
                className="flex flex-col p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xs"
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="font-mono font-bold leading-none text-white text-3xl sm:text-4xl"
                    style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {metric.value}
                  </span>
                  <div className="p-2 rounded-lg bg-white/10 text-[#FFD180]">
                    <Icon size={18} />
                  </div>
                </div>

                <span
                  className="text-sm font-semibold text-[#E8EDF3] mb-1"
                  style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}
                >
                  {metric.label}
                </span>

                <span
                  className="text-xs leading-relaxed text-[#A9B6C6]"
                  style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}
                >
                  {metric.sub}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
