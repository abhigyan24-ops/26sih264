import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

const LAYERS = [
  { label: 'Frontend', tools: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'TanStack Query/Table', 'Recharts'] },
  { label: 'Backend', tools: ['Python', 'FastAPI', 'Pydantic', 'SQLAlchemy', 'JWT + bcrypt'] },
  { label: 'Database', tools: ['PostgreSQL', 'pg_trgm', 'pgvector', 'Full-text search'] },
  { label: 'AI / ML', tools: ['fastembed (ONNX)', 'MiniLM-L12-v2', 'scikit-learn', 'rapidfuzz'] },
  { label: 'Jobs', tools: ['APScheduler', 'Docker', 'Docker Compose'] },
]

export default function TechStack() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const headerRef = useRef(null)
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' })
  const prefersReduced = useReducedMotion()

  return (
    <section
      id="tech-stack"
      aria-label="Technology stack"
      className="py-14 sm:py-24"
      style={{ background: '#FFFFFF', borderTop: '1px solid #DAD6CC' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="mb-8 sm:mb-12"
        >
          <span
            className="text-xs font-mono uppercase tracking-widest mb-2.5 block"
            style={{ color: '#5B6068', fontFamily: '"IBM Plex Mono", monospace' }}
          >
            Architecture
          </span>
          <h2
            className="text-2xl sm:text-3xl font-semibold leading-tight mb-3"
            style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Sans", sans-serif' }}
          >
            Built on open standards, runs anywhere.
          </h2>
          <p className="text-sm sm:text-base max-w-2xl text-[#5B6068]">
            No proprietary lock-in. Deployable in an AICTE data centre, a government cloud, or a
            single server.
          </p>
        </motion.div>

        {/* Stack rows */}
        <div ref={ref} className="flex flex-col divide-y" style={{ borderColor: '#DAD6CC', border: '1px solid #DAD6CC', borderRadius: 8, overflow: 'hidden' }}>
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, x: prefersReduced ? 0 : -16 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.28, ease: 'easeOut', delay: i * 0.07 }}
              className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-6 px-4 sm:px-6 py-3.5 sm:py-4"
              style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F6F5F1' }}
            >
              {/* Layer label */}
              <span
                className="text-xs font-mono font-bold sm:font-normal shrink-0 text-[#1F3A5F] sm:text-[#5B6068]"
                style={{
                  minWidth: 88,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                {layer.label}
              </span>
              {/* Divider */}
              <span
                className="hidden sm:block w-px self-stretch"
                style={{ background: '#DAD6CC' }}
                aria-hidden="true"
              />
              {/* Tool pills */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {layer.tools.map(tool => (
                  <span
                    key={tool}
                    className="text-[11px] sm:text-xs font-mono px-2 sm:px-2.5 py-0.5 sm:py-1 rounded"
                    style={{
                      background: '#EFEDE7',
                      border: '1px solid #DAD6CC',
                      color: '#1B1F24',
                      fontFamily: '"IBM Plex Mono", monospace',
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Not used note */}
        <p
          className="mt-6 text-sm italic leading-relaxed"
          style={{ color: '#8C8A82', fontFamily: '"IBM Plex Sans", sans-serif' }}
        >
          Not used, and why: Celery/Redis (job volume too small for a message broker), Elasticsearch
          (PostgreSQL covers fuzzy and full-text search), separate vector database (pgvector is
          sufficient), Kubernetes (too heavy for scope), mandatory LLM (embeddings + linear model
          are explainable and cost zero per call).
        </p>
      </div>
    </section>
  )
}
