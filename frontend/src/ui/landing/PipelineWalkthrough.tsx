import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'motion/react'
import { 
  Inbox, 
  Building2, 
  Languages, 
  GitCompare, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  RefreshCw,
  ChevronRight,
  FileCheck
} from 'lucide-react'

const PIPELINE_STEPS = [
  {
    step: '01',
    title: 'Complaint Ingestion',
    short: 'Intake & Normalization',
    icon: Inbox,
    bureau: 'Multi-Source',
    description: 'Complaints arrive from CPGRAMS, Regulation Bureau (RB), PGRC public cell, or Regional Offices via automated CSV/XLSX import adapters and direct officer filing.',
    detail: {
      input: 'Raw grievance payload / inspection report',
      output: 'Standardized case schema with timestamped audit header',
      highlight: 'Zero double-entry · Preserves source case reference'
    }
  },
  {
    step: '02',
    title: 'Institution Resolution',
    short: 'AICTE ID Matching',
    icon: Building2,
    bureau: 'Resolution Ladder',
    description: 'System queries the AICTE Master Registry using exact Permanent ID first. For unstructured complaints, it falls back to rarity-weighted trigram similarity.',
    detail: {
      input: 'Unstructured college name e.g. "Govt Engg Coll Pune"',
      output: 'Resolved to AICTE ID: 1-492019 (Confidence: 0.98)',
      highlight: 'Prevents duplicate profiles · Human review below floor'
    }
  },
  {
    step: '03',
    title: 'Multilingual Embedding',
    short: '50-Language NLP',
    icon: Languages,
    bureau: 'Local CPU Model',
    description: 'Complaint narrative is embedded locally on CPU into a 384-dimensional dense semantic vector using paraphrase-multilingual-MiniLM-L12-v2.',
    detail: {
      input: 'English, Hindi, or mixed Hinglish grievance text',
      output: '384-dimensional dense float vector',
      highlight: 'CPU-only (fastembed ONNX) · 100% Offline · No external API call'
    }
  },
  {
    step: '04',
    title: 'Open Case Retrieval',
    short: 'Targeted Candidate Fetch',
    icon: GitCompare,
    bureau: 'PostgreSQL Vector',
    description: 'PostgreSQL pgvector indexes fetch existing active and historical complaints linked to the resolved institution, bypassing unrelated institutions.',
    detail: {
      input: 'Institution AICTE ID + 384-dim vector',
      output: 'Candidate case pairs across RB, PGRC, and Regional desks',
      highlight: 'Sub-millisecond cosine distance scan via pgvector'
    }
  },
  {
    step: '05',
    title: 'Calibrated Overlap Scoring',
    short: '6-Feature Logistic Model',
    icon: Sparkles,
    bureau: 'Intelligence Core',
    description: 'Computes 6 interaction features: institution confidence, text cosine similarity, category match, receipt date delta, active state, and cross-bureau status.',
    detail: {
      input: '6-dimensional interaction vector',
      output: 'Calibrated probability (e.g. 91.4%) categorized into High/Medium/Info',
      highlight: 'Isotonic calibration · PR-AUC 0.9366 vs 0.6749 baseline'
    }
  },
  {
    step: '06',
    title: 'Inter-Bureau Coordination',
    short: 'Human-in-the-Loop',
    icon: Users,
    bureau: 'Joint Action Dock',
    description: 'When High overlap is flagged, both bureaus receive an alert. Officers coordinate: Link cases, nominate lead bureau, or hold parallel inspection notices.',
    detail: {
      input: 'Joint officer review screen with side-by-side word diff',
      output: 'Designated Lead Bureau + Candidate Held in Coordination',
      highlight: '1 Institution = 1 Coordinated Action · No contradictory notices'
    }
  },
  {
    step: '07',
    title: 'Lifecycle & SLA Monitoring',
    short: 'Disposal Tracking',
    icon: FileCheck,
    bureau: 'APScheduler Worker',
    description: 'Background scanner calculates disposal age against category deadlines. Predictive breach warnings trigger proactive tier-1 escalation.',
    detail: {
      input: 'Category SLA rules + Case age telemetry',
      output: 'Proactive warnings at 75% threshold · Automated escalation',
      highlight: 'Aligned with DARPG 21-day timeline guidelines'
    }
  },
  {
    step: '08',
    title: 'Active Learning & Governance',
    short: 'Self-Improving Engine',
    icon: RefreshCw,
    bureau: 'Statutory Registry',
    description: 'Officer confirmations and dismissals (with mandatory reasons) become training labels. New models train in shadow mode with zero unverified promotions.',
    detail: {
      input: 'Labeled confirmation/dismissal decisions',
      output: 'Shadow model benchmarked against active version',
      highlight: 'Audited parameter registry · Continuous accuracy drift check'
    }
  }
]

export default function PipelineWalkthrough() {
  const [activeIdx, setActiveIdx] = useState(0)
  const prefersReduced = useReducedMotion()
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '-60px' })
  const activeStep = PIPELINE_STEPS[activeIdx]
  const Icon = activeStep.icon

  return (
    <section
      id="pipeline"
      ref={sectionRef}
      aria-label="Eight-step complaint lifecycle pipeline"
      className="py-14 sm:py-24 relative overflow-hidden"
      style={{ background: '#FFFFFF', borderTop: '1px solid #DAD6CC' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-3xl mb-10 sm:mb-14"
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="text-xs font-mono uppercase tracking-widest text-[#1F3A5F] font-semibold"
              style={{ fontFamily: '"IBM Plex Mono", monospace' }}
            >
              End-to-End Workflow Architecture
            </span>
            <span className="text-xs font-mono text-[#067647] bg-[#E6F4EC] px-2 py-0.5 rounded border border-[#A8E2C2]">
              Verified in Prototype
            </span>
          </div>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-[#1F3A5F]"
            style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}
          >
            From intake to coordinated disposal in eight verifiable steps.
          </h2>
          <p className="text-sm sm:text-base text-[#5B6068] mt-2">
            Click any step to inspect how CaseNexus orchestrates institution resolution, CPU-bound multilingual matching, and human-in-the-loop decision recording.
          </p>
        </motion.div>

        {/* Horizontal Step Selector Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6 sm:mb-8">
          {PIPELINE_STEPS.map((s, idx) => {
            const isSelected = activeIdx === idx
            const StepIcon = s.icon
            return (
              <button
                key={s.step}
                onClick={() => setActiveIdx(idx)}
                className={`flex flex-col items-start p-2.5 sm:p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-xs ring-2 ring-[#1F3A5F]/20'
                    : 'bg-[#FAF9F6] border-[#DAD6CC] text-[#5B6068] hover:bg-[#F6F5F1] hover:text-[#1B1F24]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-[#FFD180]' : 'text-[#8A4B08]'}`}>
                    {s.step}
                  </span>
                  <StepIcon size={14} className={isSelected ? 'text-white' : 'text-[#5B6068]'} />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold leading-tight line-clamp-1 truncate w-full">
                  {s.short}
                </span>
              </button>
            )
          })}
        </div>

        {/* Detailed Interactive Inspector Card */}
        <div className="rounded-xl border border-[#DAD6CC] bg-[#FAF9F6] p-4 sm:p-6 lg:p-8 shadow-2xs">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"
            >
              {/* Left Detail Description (7 cols) */}
              <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#1F3A5F] text-white shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono text-[#8A4B08] font-bold block">
                      STAGE {activeStep.step} OF 08 · {activeStep.bureau}
                    </span>
                    <h3 className="text-lg sm:text-xl font-semibold text-[#1F3A5F]">
                      {activeStep.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed text-[#1B1F24]">
                  {activeStep.description}
                </p>

                <div className="pt-1 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#067647] bg-[#E6F4EC] px-2.5 py-1 rounded border border-[#A8E2C2]">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>{activeStep.detail.highlight}</span>
                  </span>
                </div>
              </div>

              {/* Right Technical I/O Box (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-lg border border-[#DAD6CC] p-3.5 sm:p-4.5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#DAD6CC]">
                  <span className="text-[#5B6068] text-[11px]">System Contract & Execution</span>
                  <span className="text-[#175CD3] text-[10px] bg-[#E8F0FE] px-1.5 py-0.2 rounded font-semibold">
                    Step {activeStep.step}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-[#8A4B08] uppercase font-bold tracking-wider block">Input Payload:</span>
                  <p className="text-[#1B1F24] bg-[#F6F5F1] p-2 rounded border border-[#DAD6CC] leading-relaxed break-words text-[11px] sm:text-xs">
                    {activeStep.detail.input}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-[#067647] uppercase font-bold tracking-wider block">Engine Output:</span>
                  <p className="text-[#1B1F24] bg-[#E6F4EC]/40 p-2 rounded border border-[#A8E2C2] leading-relaxed break-words text-[11px] sm:text-xs">
                    {activeStep.detail.output}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Stepper Navigation Controls */}
          <div className="mt-6 sm:mt-8 pt-4 border-t border-[#DAD6CC] flex items-center justify-between text-xs font-mono">
            <button
              onClick={() => setActiveIdx((prev) => (prev > 0 ? prev - 1 : PIPELINE_STEPS.length - 1))}
              className="text-[#5B6068] hover:text-[#1F3A5F] px-2.5 py-1.5 rounded hover:bg-[#EFEDE7] transition-colors cursor-pointer"
            >
              ← Prev
            </button>
            <span className="text-[#8C8A82]">
              {activeStep.step} / 08
            </span>
            <button
              onClick={() => setActiveIdx((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : 0))}
              className="text-[#1F3A5F] font-semibold hover:underline flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-[#EFEDE7] transition-colors cursor-pointer"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
