import { useState, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion, useInView } from 'motion/react'
import { 
  GitMerge, 
  Building2, 
  Clock, 
  Lock, 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  Activity
} from 'lucide-react'

// Tab 1: Live Overlap Intelligence Interactive View
function OverlapIntelligenceView() {
  const [threshold, setThreshold] = useState(0.85)

  return (
    <div className="bg-white rounded-xl border border-[#DAD6CC] p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-3">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#175CD3] bg-[#E8F0FE] px-2 py-0.5 rounded">
            Feature 01 · NLP Semantic Overlap
          </span>
          <h4 className="text-base font-semibold text-[#1B1F24] mt-1">Cross-Bureau Semantic Diff Engine</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#5B6068]">Learned Policy Target: 0.90 Precision</span>
        </div>
      </div>

      {/* Side-by-Side Live Diff Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1F3A5F]">Bureau: Regulation Bureau (RB)</span>
            <span className="text-[11px] font-mono text-[#5B6068]">ID: RB-2026-089</span>
          </div>
          <p className="text-xs text-[#1B1F24] leading-relaxed">
            "Official surprise inspection revealed that the college has{' '}
            <mark className="bg-[#FFF3E0] text-[#9A4A00] px-1 rounded">35% faculty deficit</mark>{' '}
            against AICTE mandatory norms and has enrolled{' '}
            <mark className="bg-[#FFF3E0] text-[#9A4A00] px-1 rounded">120 excess unapproved students</mark>{' '}
            in B.Tech Computer Engineering."
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A4B08]">Cell: Public Grievance (PGRC)</span>
            <span className="text-[11px] font-mono text-[#5B6068]">ID: PGRC-2026-142</span>
          </div>
          <p className="text-xs text-[#1B1F24] leading-relaxed">
            "Student council submitted CPGRAMS complaint stating{' '}
            <mark className="bg-[#FFF3E0] text-[#9A4A00] px-1 rounded">professors are missing/ghost staff</mark>{' '}
            with no classes held, and administration admitted{' '}
            <mark className="bg-[#FFF3E0] text-[#9A4A00] px-1 rounded">extra students beyond sanctioned capacity</mark>."
          </p>
        </div>
      </div>

      {/* Dynamic Scorer Controls */}
      <div className="p-3.5 rounded-lg bg-[#F6F5F1] border border-[#DAD6CC] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sliders size={16} className="text-[#1F3A5F]" />
          <div>
            <span className="text-xs font-semibold text-[#1B1F24]">Interactive Confidence Threshold:</span>
            <span className="text-xs font-mono font-bold text-[#1F3A5F] ml-2">{threshold.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.60"
            max="0.95"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-32 accent-[#1F3A5F] cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#5B6068]">Predicted Probability:</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#E6F4EC] text-[#067647] border border-[#A8E2C2]">
            91.4% (Exceeds {threshold.toFixed(2)} → Action Required)
          </span>
        </div>
      </div>
    </div>
  )
}

// Tab 2: Institution 360 Matrix View
function Institution360View() {
  return (
    <div className="bg-white rounded-xl border border-[#DAD6CC] p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-3">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#067647] bg-[#E6F4EC] px-2 py-0.5 rounded">
            Feature 02 · Holistic Oversight
          </span>
          <h4 className="text-base font-semibold text-[#1B1F24] mt-1">Unified Institution 360 Profile</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 bg-[#FAF9F6] border border-[#DAD6CC] rounded font-semibold text-[#1F3A5F]">
            AICTE Master Permanent ID: 1-492019
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC]">
          <span className="text-[11px] font-mono text-[#5B6068] uppercase">Composite Risk Score</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#B42318]">78 / 100</span>
            <span className="text-xs font-semibold text-[#B42318] bg-[#FDECEA] px-1.5 py-0.5 rounded">Elevated</span>
          </div>
          <p className="text-[11px] text-[#5B6068] mt-1">Driven by dual concurrent bureau cases</p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC]">
          <span className="text-[11px] font-mono text-[#5B6068] uppercase">Active Cases</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#1F3A5F]">2 Active</span>
            <span className="text-xs text-[#5B6068] font-mono">(1 RB, 1 PGRC)</span>
          </div>
          <p className="text-[11px] text-[#5B6068] mt-1">0 conflicting parallel notices</p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC]">
          <span className="text-[11px] font-mono text-[#5B6068] uppercase">Jurisdiction</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#1F3A5F]">Western RO</span>
            <span className="text-xs text-[#067647] font-mono">Scoped</span>
          </div>
          <p className="text-[11px] text-[#5B6068] mt-1">Row-level security active</p>
        </div>
      </div>

      {/* Multi-Bureau Timeline */}
      <div className="p-4 rounded-lg bg-[#F6F5F1] border border-[#DAD6CC] space-y-3">
        <span className="text-xs font-semibold text-[#1B1F24] block">Consolidated Bureau Event Log</span>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3 p-2 bg-white rounded border border-[#DAD6CC]">
            <span className="w-2 h-2 rounded-full bg-[#175CD3]" />
            <span className="font-mono text-[#5B6068]">24 Oct 2026</span>
            <span className="font-semibold text-[#1F3A5F]">RB Inspection Logged:</span>
            <span className="text-[#5B6068]">Faculty records impounded for verification.</span>
          </div>
          <div className="flex items-center gap-3 p-2 bg-white rounded border border-[#DAD6CC]">
            <span className="w-2 h-2 rounded-full bg-[#9A4A00]" />
            <span className="font-mono text-[#5B6068]">26 Oct 2026</span>
            <span className="font-semibold text-[#8A4B08]">PGRC Petition Registered:</span>
            <span className="text-[#5B6068]">Student union escalation received via CPGRAMS.</span>
          </div>
          <div className="flex items-center gap-3 p-2 bg-[#E6F4EC] rounded border border-[#A8E2C2]">
            <span className="w-2 h-2 rounded-full bg-[#067647]" />
            <span className="font-mono text-[#067647] font-semibold">27 Oct 2026</span>
            <span className="font-semibold text-[#067647]">CaseNexus Automatic Overlap Detected:</span>
            <span className="text-[#067647]">Parallel actions held; joint coordination initiated.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Tab 3: Autonomous SLA Escalation View
function SlaEscalationView() {
  return (
    <div className="bg-white rounded-xl border border-[#DAD6CC] p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-3">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#9A4A00] bg-[#FFF3E0] px-2 py-0.5 rounded">
            Feature 03 · Timely Redressal
          </span>
          <h4 className="text-base font-semibold text-[#1B1F24] mt-1">Dynamic SLA Risk & Escalation Engine</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#067647] bg-[#E6F4EC] px-2 py-0.5 rounded border border-[#A8E2C2]">
            APScheduler Background Worker Active
          </span>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#1B1F24]">Case #RB-2026-089 (Norms Violation)</span>
            <p className="text-xs text-[#5B6068]">Prescribed SLA: 30 Calendar Days (AICTE Regulation 2024)</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#B42318] bg-[#FDECEA] px-2.5 py-1 rounded border border-[#F8B7B2]">
            4 Days Remaining (At Risk)
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-[#E2DFD7] h-2.5 rounded-full overflow-hidden flex">
            <div className="bg-[#067647] h-full" style={{ width: '60%' }} title="On Track" />
            <div className="bg-[#FFB74D] h-full" style={{ width: '25%' }} title="Approaching Deadline" />
            <div className="bg-[#B42318] h-full animate-pulse" style={{ width: '15%' }} title="Escalation Threshold" />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-[#5B6068]">
            <span>Day 0 (Received)</span>
            <span>Day 26 (Current)</span>
            <span className="text-[#B42318] font-bold">Day 30 (SLA Breach)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg border border-[#DAD6CC] bg-white flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-[#9A4A00] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#1B1F24]">Predictive Breach Survival Curve</span>
            <p className="text-[#5B6068] mt-0.5">Calculated from 400+ historical cases: 82% likelihood of breach if hearing not scheduled by Day 25.</p>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-[#DAD6CC] bg-white flex items-start gap-2.5">
          <Clock size={16} className="text-[#175CD3] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#1B1F24]">Automatic Tier-1 Escalation</span>
            <p className="text-[#5B6068] mt-0.5">Direct notice dispatched to Bureau Head if idle for &gt; 48 hours in "Under Process" status.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Tab 4: Air-Gapped Sovereign Security View
function AirGapSecurityView() {
  const [isOffline, setIsOffline] = useState(true)

  return (
    <div className="bg-white rounded-xl border border-[#DAD6CC] p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-3">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1F3A5F] bg-[#E8EDF3] px-2 py-0.5 rounded">
            Feature 04 · Government Sovereign Privacy
          </span>
          <h4 className="text-base font-semibold text-[#1B1F24] mt-1">Statutory Mode Router & Immutable Egress Ledger</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#067647] flex items-center gap-1 font-semibold">
            <ShieldCheck size={14} /> Zero Cloud Leakage
          </span>
        </div>
      </div>

      {/* Interactive Switch Simulator */}
      <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#DAD6CC] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#1B1F24]">Active Operational Boundary Policy:</span>
          <p className="text-xs text-[#5B6068]">Hardware-isolated execution guarantee without third-party CDN or cloud telemetry.</p>
        </div>

        <button
          onClick={() => setIsOffline(!isOffline)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all font-mono text-xs font-bold"
          style={{
            background: isOffline ? '#E6F4EC' : '#FFF3E0',
            borderColor: isOffline ? '#A8E2C2' : '#FCD299',
            color: isOffline ? '#067647' : '#9A4A00',
          }}
        >
          {isOffline ? <Lock size={13} /> : <Activity size={13} />}
          <span>{isOffline ? 'MODE: AIR-GAPPED LOCAL (ACTIVE)' : 'MODE: SOVEREIGN CLOUD'}</span>
          <span className="text-[10px] underline ml-1">(Click to Toggle)</span>
        </button>
      </div>

      {/* Live Egress Ledger Stream */}
      <div className="p-3.5 rounded-lg bg-[#14233A] text-[#E8EDF3] font-mono text-xs space-y-2">
        <div className="flex items-center justify-between text-[#A9B6C6] pb-1 border-b border-white/10 text-[11px]">
          <span>Egress Audit Ledger (Immutable Stream)</span>
          <span className="text-[#81C784]">● Audit Loop Armed</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <p className="text-[#81C784]">&gt; [POLICY-ENFORCE] Outbound request to external LLM API blocked (Status: BLOCKED_BY_AIRGAP)</p>
          <p className="text-[#E8EDF3]">&gt; [EMBED-LOCAL] Model paraphrase-multilingual-MiniLM-L12 executed on local CPU (0ms egress)</p>
          <p className="text-[#FFB74D]">&gt; [MASK-DATA] Student identity masked: SHA-256 hash written to secure audit log</p>
          <p className="text-[#81C784]">&gt; [COMPLIANCE] Verification passed: 100% of telemetry retained inside on-premise perimeter</p>
        </div>
      </div>
    </div>
  )
}

export default function SolutionLayers() {
  const [activeTab, setActiveTab] = useState<'overlap' | 'inst360' | 'sla' | 'privacy'>('overlap')
  const prefersReduced = useReducedMotion()
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '-60px' })

  const TABS = [
    { id: 'overlap', label: '01 Overlap Intelligence', icon: GitMerge },
    { id: 'inst360', label: '02 Institution 360 Matrix', icon: Building2 },
    { id: 'sla', label: '03 Autonomous SLA Escalation', icon: Clock },
    { id: 'privacy', label: '04 Air-Gapped Egress Guard', icon: Lock },
  ] as const

  return (
    <section
      id="interactive-layers"
      ref={sectionRef}
      aria-label="Interactive CaseNexus feature suite"
      className="py-24 relative overflow-hidden"
      style={{ background: '#F6F5F1', borderTop: '1px solid #DAD6CC' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-center max-w-3xl mx-auto mb-14 space-y-3"
        >
          <span
            className="text-xs font-mono uppercase tracking-widest block text-[#8A4B08]"
            style={{ fontFamily: '"IBM Plex Mono", monospace' }}
          >
            Tactile Product Architecture
          </span>
          <h2
            className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1F3A5F]"
            style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}
          >
            A coordination layer, not another passive dashboard.
          </h2>
          <p className="text-base text-[#5B6068]">
            Click through the live capability simulator below to experience how CaseNexus detects overlaps, protects sovereignty, and prevents conflicting statutory notices.
          </p>
        </motion.div>

        {/* Interactive Tab Selectors (Steep Style) */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-[#5B6068] bg-white border border-[#DAD6CC] hover:bg-[#FAF9F6] hover:text-[#1B1F24]'
                }`}
                style={{
                  background: isActive ? '#1F3A5F' : undefined,
                }}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-[#8A4B08]'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Dynamic Interactive Panel Container */}
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {activeTab === 'overlap' && <OverlapIntelligenceView />}
              {activeTab === 'inst360' && <Institution360View />}
              {activeTab === 'sla' && <SlaEscalationView />}
              {activeTab === 'privacy' && <AirGapSecurityView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
