import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { 
  Shield, 
  Sparkles, 
  GitMerge, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  ArrowRight,
  RefreshCw,
  Scale,
  Zap,
  Radio
} from 'lucide-react'
import SpotlightCard from './SpotlightCard'
import ShimmerButton from './ShimmerButton'

// Live Interactive Overlap Simulator Component for Hero
function HeroInteractiveWidget() {
  const [stage, setStage] = useState<'scan' | 'matched' | 'linked'>('matched')
  const [activeTab, setActiveTab] = useState<'complaints' | 'weights'>('complaints')
  const prefersReduced = useReducedMotion()
  const similarity = 91.4

  const handleReset = () => {
    setStage('scan')
    setTimeout(() => {
      setStage('matched')
    }, 1200)
  }

  const handleLink = () => {
    setStage('linked')
  }

  return (
    <SpotlightCard className="p-0 border border-[#DAD6CC]">
      {/* Top Header / Status bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#EFEDE7] border-b border-[#DAD6CC]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E57373]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFB74D]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#81C784]" />
          </div>
          <span className="text-xs font-mono font-medium text-[#5B6068] ml-2 flex items-center gap-1.5">
            <Shield size={12} className="text-[#1F3A5F]" />
            AICTE Cross-Bureau Overlap Engine · Model v2.4 (Calibrated)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#E8F0FE] text-[#175CD3] border border-[#B8D5FA]">
            <Radio size={11} className="animate-pulse text-[#175CD3]" />
            CPU ONNX · 384-dim
          </span>
        </div>
      </div>

      {/* Target Institution Bar */}
      <div className="px-5 py-3 bg-[#FAF9F6] border-b border-[#DAD6CC] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#E8EDF3] text-[#1F3A5F]">
            <Building2 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-1.5 py-0.2 bg-[#E2DFD7] text-[#1B1F24] rounded font-semibold">
                AICTE-1-492019
              </span>
              <span className="text-xs font-semibold text-[#1B1F24]">
                Apex Institute of Technology &amp; Engineering
              </span>
            </div>
            <p className="text-[11px] text-[#5B6068]">Western Region · Pune, Maharashtra · Status: 2 Active Investigations</p>
          </div>
        </div>
        <button 
          onClick={handleReset}
          className="text-xs font-mono flex items-center gap-1 text-[#5B6068] hover:text-[#1F3A5F] px-2.5 py-1 rounded-md hover:bg-[#EFEDE7] transition-colors cursor-pointer"
          title="Re-run simulated overlap scan"
        >
          <RefreshCw size={11} className={stage === 'scan' ? 'animate-spin' : ''} />
          <span>Rescan</span>
        </button>
      </div>

      {/* Main Analysis Body */}
      <div className="p-5 space-y-4">
        {/* Interactive Mode Tabs */}
        <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('complaints')}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'complaints'
                  ? 'bg-[#1F3A5F] text-white shadow-xs font-semibold'
                  : 'text-[#5B6068] hover:bg-[#EFEDE7]'
              }`}
            >
              Dual Complaint Match
            </button>
            <button
              onClick={() => setActiveTab('weights')}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'weights'
                  ? 'bg-[#1F3A5F] text-white shadow-xs font-semibold'
                  : 'text-[#5B6068] hover:bg-[#EFEDE7]'
              }`}
            >
              6-Feature Explainability
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#5B6068]">Overlap Score:</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#FDECEA] text-[#B42318] border border-[#F8B7B2] flex items-center gap-1">
              <AlertTriangle size={11} />
              {stage === 'scan' ? 'CALCULATING...' : `${similarity}% HIGH`}
            </span>
          </div>
        </div>

        {/* Tab 1: Dual Complaint Stream with Animated Collision Radar */}
        {activeTab === 'complaints' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
              {/* Central Collision Radar Node */}
              <div className="hidden md:flex absolute inset-y-0 left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none z-10">
                <div className="relative flex items-center justify-center">
                  {/* Rotating Radar Sweep Pulse */}
                  {!prefersReduced && (
                    <div className="absolute w-12 h-12 rounded-full border border-[#1F3A5F]/30 animate-ping opacity-75" />
                  )}
                  <div className="w-8 h-8 rounded-full bg-[#1F3A5F] text-white flex items-center justify-center shadow-lg border-2 border-white relative z-10">
                    <GitMerge size={15} className="rotate-90" />
                  </div>
                </div>
              </div>

              {/* Case A: Regulation Bureau */}
              <div className="p-3.5 rounded-xl border border-[#DAD6CC] bg-[#FFFFFF] relative space-y-2 shadow-xs hover:border-[#8C8A82] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#175CD3] bg-[#E8F0FE] px-2 py-0.5 rounded">
                    Case #RB-2026-089 (Regulatory)
                  </span>
                  <span className="text-[11px] text-[#5B6068] font-mono">Recd 4d ago</span>
                </div>
                <p className="text-xs text-[#1B1F24] leading-relaxed">
                  "Inspection finding: Institutional audit discovered{' '}
                  <span className="bg-[#FFF3E0] text-[#9A4A00] font-medium px-1 rounded border border-[#FCD299]">
                    faculty shortfall exceeding 35%
                  </span>{' '}
                  and unauthorized expansion of{' '}
                  <span className="bg-[#FFF3E0] text-[#9A4A00] font-medium px-1 rounded border border-[#FCD299]">
                    120 unapproved CSE intake seats
                  </span>."
                </p>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#5B6068] border-t border-[#F0EEE9]">
                  <span>Lead Officer: Er. Verma (RB)</span>
                  <span className="text-[#067647] font-medium">Notice Drafted</span>
                </div>
              </div>

              {/* Case B: PGRC Grievance */}
              <div className="p-3.5 rounded-xl border border-[#DAD6CC] bg-[#FFFFFF] space-y-2 shadow-xs hover:border-[#8C8A82] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A4B08] bg-[#FFF3E0] px-2 py-0.5 rounded">
                    Case #PGRC-2026-142 (Public Cell)
                  </span>
                  <span className="text-[11px] text-[#5B6068] font-mono">Recd 2d ago</span>
                </div>
                <p className="text-xs text-[#1B1F24] leading-relaxed">
                  "CPGRAMS Student Petition: Teachers listed on AICTE portal{' '}
                  <span className="bg-[#FFF3E0] text-[#9A4A00] font-medium px-1 rounded border border-[#FCD299]">
                    never take lectures (ghost faculty)
                  </span>{' '}
                  and college enrolled{' '}
                  <span className="bg-[#FFF3E0] text-[#9A4A00] font-medium px-1 rounded border border-[#FCD299]">
                    excess students beyond official sanctions
                  </span>."
                </p>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#5B6068] border-t border-[#F0EEE9]">
                  <span>Lead Officer: Dr. Rao (PGRC)</span>
                  <span className="text-[#B42318] font-medium">Investigation Open</span>
                </div>
              </div>
            </div>

            {/* Semantic Token Match Ribbon */}
            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#8A4B08]" />
                <span className="font-semibold text-[#1B1F24]">AI Semantic Finding:</span>
                <span className="text-[#5B6068]">Paraphrased match detected on faculty shortfall &amp; unauthorized admissions.</span>
              </div>
              <span className="font-mono font-bold text-[#067647] bg-[#E6F4EC] px-2 py-0.5 rounded border border-[#A8E2C2]">
                Isotonic P = 0.914
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Feature Weights */}
        {activeTab === 'weights' && (
          <div className="space-y-2.5 py-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { name: 'Institution Match (Exact AICTE ID)', weight: 1.0, impact: 'Positive (+0.42)' },
                { name: 'Cosine Semantic Embedding (MiniLM)', weight: 0.88, impact: 'Positive (+0.36)' },
                { name: 'Category Co-occurrence (Norms)', weight: 1.0, impact: 'Positive (+0.12)' },
                { name: 'Temporal Proximity (2 days apart)', weight: 0.94, impact: 'Positive (+0.08)' },
                { name: 'Both Cases In-Process', weight: 1.0, impact: 'Active (+0.05)' },
                { name: 'Cross-Bureau Flag (RB vs PGRC)', weight: 1.0, impact: 'Coordination Required' },
              ].map((feat) => (
                <div key={feat.name} className="p-2 rounded-lg border border-[#DAD6CC] bg-[#FAF9F6]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-[#1B1F24] truncate">{feat.name}</span>
                    <span className="font-mono text-[#067647] text-[11px] font-semibold">{feat.impact}</span>
                  </div>
                  <div className="w-full bg-[#E2DFD7] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#1F3A5F] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${feat.weight * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Interactive Decision Dock */}
        <div className="pt-2 border-t border-[#DAD6CC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {stage === 'linked' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#067647] bg-[#E6F4EC] px-3 py-1.5 rounded-lg border border-[#A8E2C2]">
                <CheckCircle2 size={13} />
                Bureaus Linked · Regulation Bureau Designated as Lead
              </span>
            ) : (
              <span className="text-xs text-[#5B6068] flex items-center gap-1 font-mono">
                <Clock size={12} />
                Action: Dual regulatory investigation risks contradictory notice
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stage !== 'linked' ? (
              <>
                <button
                  onClick={handleLink}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1F3A5F] text-white hover:bg-[#17304F] shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <GitMerge size={12} />
                  Link &amp; Nominate Lead
                </button>
                <button
                  onClick={handleLink}
                  className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC] text-[#1B1F24] hover:bg-[#EFEDE7] transition-all cursor-pointer"
                >
                  Hold Parallel
                </button>
              </>
            ) : (
              <button
                onClick={handleReset}
                className="text-xs font-mono text-[#175CD3] hover:underline cursor-pointer"
              >
                Reset Simulation
              </button>
            )}
          </div>
        </div>
      </div>
    </SpotlightCard>
  )
}

const LAYERS = [
  {
    icon: Scale,
    color: '#1F3A5F',
    label: 'Visibility',
    title: 'Central Institution 360',
    description: 'Every inspection, grievance and notice unified by AICTE Permanent ID.',
  },
  {
    icon: Zap,
    color: '#067647',
    label: 'Intelligence',
    description: 'Calibrated ML overlap detection across bureaus with 50-language NLP.',
  },
  {
    icon: GitMerge,
    color: '#8A4B08',
    label: 'Coordination',
    description: 'Designate lead bureau, hold parallel actions, eliminate contradictory orders.',
  },
]

export default function HeroSection() {
  const navigate = useNavigate()
  const prefersReduced = useReducedMotion()

  return (
    <section
      className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden"
      style={{ background: '#F6F5F1' }}
      aria-label="CaseNexus introduction"
    >
      {/* Subtle Blueprint Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(218, 214, 204, 0.45) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(218, 214, 204, 0.45) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
        }}
        aria-hidden="true"
      />

      {/* Luminous Top Radial Glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] pointer-events-none opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(31,58,95,0.18) 0%, rgba(246,245,241,0) 70%)'
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-6 w-full pt-20 pb-16 z-10">
        {/* Main Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

          {/* LEFT: Copy & Direct Action (5 cols) */}
          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="lg:col-span-5 flex flex-col gap-6"
          >
            {/* National Statutory Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1 rounded-full border shadow-xs"
                style={{
                  color: '#1F3A5F',
                  background: '#FFFFFF',
                  borderColor: '#DAD6CC',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                <Shield size={12} className="text-[#8A4B08]" />
                SIH26264 · Team Mutexia
              </span>
              <span
                className="inline-flex items-center text-xs font-mono px-2.5 py-1 rounded-full border font-semibold"
                style={{
                  color: '#067647',
                  background: '#E6F4EC',
                  borderColor: '#A8E2C2',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                Smart Automation
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1
                className="text-4xl sm:text-5xl font-semibold leading-[1.14] tracking-tight"
                style={{ color: '#1F3A5F', fontFamily: '"IBM Plex Sans", sans-serif' }}
              >
                No AICTE officer should act on an institution{' '}
                <span className="relative inline-block text-[#8A4B08] underline decoration-[#8A4B08]/30 decoration-4 underline-offset-6">
                  blind again.
                </span>
              </h1>
              <p
                className="text-lg font-normal leading-relaxed text-[#5B6068]"
              >
                An intelligent coordination nerve-center uniting the Regulation Bureau (RB), Public Grievance Redressal Cell (PGRC), and Regional Offices into a synchronized single window.
              </p>
            </div>

            {/* Three Capabilities Quick Strip */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {LAYERS.map(({ icon: Icon, color, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg p-2.5 bg-white border border-[#DAD6CC] shadow-xs"
                >
                  <Icon size={16} style={{ color, flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-[#1B1F24]">{label}</span>
                </div>
              ))}
            </div>

            {/* CTAs with ShimmerButton */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <ShimmerButton
                onClick={() => navigate('/login')}
              >
                <span>Access Live Prototype</span>
                <ArrowRight size={14} />
              </ShimmerButton>
              
              <ShimmerButton
                variant="secondary"
                onClick={() => {
                  const el = document.getElementById('interactive-layers')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Explore Architecture
              </ShimmerButton>
            </div>

            {/* Verification Tag */}
            <div className="flex items-center gap-4 text-xs font-mono text-[#5B6068]">
              <span className="flex items-center gap-1 text-[#067647]">
                <CheckCircle2 size={12} />
                114 Tests Passing
              </span>
              <span>·</span>
              <span>PR-AUC 0.9366</span>
              <span>·</span>
              <span>Air-Gapped Ready</span>
            </div>
          </motion.div>

          {/* RIGHT: High-End Live Interactive Widget (7 cols) */}
          <motion.div
            initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
            className="lg:col-span-7"
          >
            <HeroInteractiveWidget />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
