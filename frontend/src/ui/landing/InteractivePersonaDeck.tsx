import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'motion/react'
import { 
  Shield, 
  Users, 
  Compass, 
  Sliders, 
  CheckCircle2, 
  Lock,
  FileCheck
} from 'lucide-react'

const PERSONAS = [
  {
    id: 'rb',
    title: 'Regulation Bureau (RB) Desk',
    role: 'Regulatory Officer · Norms Enforcement',
    icon: Shield,
    badgeColor: '#1F3A5F',
    badgeBg: '#E8EDF3',
    headline: 'Prevent punitive contradictions before issuing formal notice',
    description: 'RB officers inspecting an institution for faculty deficit or unapproved seats receive instant overlap notifications if students have already filed concurrent complaints through PGRC or CPGRAMS.',
    capabilities: [
      'Automatic pre-action overlap check on every registered campus',
      'One-click designation as Lead Bureau for multi-officer joint action',
      'Full visibility into institution historical inspection findings'
    ],
    sampleCase: 'Inspection Case #RB-2026-089 (Norms Violation · Western Region)'
  },
  {
    id: 'pgrc',
    title: 'Public Grievance (PGRC) Cell',
    role: 'Grievance Redressal Officer · Student Petitions',
    icon: Users,
    badgeColor: '#8A4B08',
    badgeBg: '#FFF3E0',
    headline: 'Accelerate student grievance redressal from 30 to 21 days',
    description: 'PGRC officers handling fee disputes or withheld certificates can put candidate parallel matters on hold while RB conducts physical inspections, ensuring students receive uniform, evidence-backed outcomes.',
    capabilities: [
      'CPGRAMS & portal complaint ingestion with AICTE ID auto-resolution',
      'Hold parallel action button to eliminate conflicting department notices',
      'Automated SLA risk alarms before statutory timeline breaches'
    ],
    sampleCase: 'Petition Case #PGRC-2026-142 (Student Fee Grievance · Pune)'
  },
  {
    id: 'regional',
    title: 'Regional Office (Western Hub)',
    role: 'Regional Director · Geo-Scoped Desk',
    icon: Compass,
    badgeColor: '#067647',
    badgeBg: '#E6F4EC',
    headline: 'Campus-wide Institution 360 across regional technical colleges',
    description: 'Row-level database security strictly scopes cases to Western Region colleges while aggregating cross-bureau actions into a single 360-degree composite risk timeline.',
    capabilities: [
      'Strict SQL row-level geographic scoping (Western, Northern, Eastern, Southern)',
      'Institution 360 composite risk scoring (Norms + Petitions combined)',
      'Direct coordination conduit with Central AICTE HQ'
    ],
    sampleCase: 'Campus AICTE-1-492019 (Apex Institute of Technology & Engineering)'
  },
  {
    id: 'admin',
    title: 'Central Management / Admin',
    role: 'Member Secretary / System Admin',
    icon: Sliders,
    badgeColor: '#175CD3',
    badgeBg: '#E8F0FE',
    headline: 'Statutory model governance, calibrated thresholds & sovereign air-gap',
    description: 'Central administrators manage parameter registries, evaluate shadow ML models on live labeled data, and enforce strict air-gapped data retention policies.',
    capabilities: [
      'Hardware-level Air-Gapped Local vs Sovereign Cloud mode toggle',
      'Model Card diagnostics with PR-AUC evaluation curves & shadow promotion',
      'Cryptographic append-only immutable egress audit ledger'
    ],
    sampleCase: 'Active Model: MiniLM-L12-v2 (Calibrated Precision 0.90 Target)'
  }
]

export default function InteractivePersonaDeck() {
  const [activeId, setActiveId] = useState('rb')
  const prefersReduced = useReducedMotion()
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '-60px' })
  const activePersona = PERSONAS.find(p => p.id === activeId) ?? PERSONAS[0]
  const Icon = activePersona.icon

  return (
    <section
      ref={sectionRef}
      aria-label="Interactive stakeholder operational personas"
      className="py-24 relative overflow-hidden"
      style={{ background: '#FAF9F6', borderTop: '1px solid #DAD6CC' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-3xl mb-12"
        >
          <span
            className="text-xs font-mono uppercase tracking-widest text-[#8A4B08] font-semibold block mb-2"
            style={{ fontFamily: '"IBM Plex Mono", monospace' }}
          >
            Multi-Stakeholder Experience
          </span>
          <h2
            className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1F3A5F]"
            style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}
          >
            Bespoke intelligence tailored for every statutory role.
          </h2>
          <p className="text-base text-[#5B6068] mt-2">
            Click through the operational desks below to preview how CaseNexus coordinates regulatory enforcement, grievance redressal, and regional oversight.
          </p>
        </motion.div>

        {/* Persona Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {PERSONAS.map((p) => {
            const isSelected = p.id === activeId
            const PIcon = p.icon
            return (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-[#1F3A5F] shadow-md ring-2 ring-[#1F3A5F]/15'
                    : 'bg-[#F6F5F1] border-[#DAD6CC] hover:bg-white text-[#5B6068] hover:text-[#1B1F24]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                    style={{
                      background: isSelected ? p.badgeColor : '#E2DFD7',
                      color: isSelected ? '#FFFFFF' : '#1B1F24'
                    }}
                  >
                    <PIcon size={18} />
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold uppercase text-[#067647] bg-[#E6F4EC] px-2 py-0.5 rounded border border-[#A8E2C2]">
                      ACTIVE DESK
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#1B1F24] mb-0.5">{p.title}</h3>
                  <p className="text-xs text-[#5B6068] truncate">{p.role}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Dynamic Persona Experience Panel */}
        <div className="rounded-2xl border border-[#DAD6CC] bg-white p-6 sm:p-8 shadow-xs">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePersona.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Role Overview (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full mb-3"
                    style={{
                      color: activePersona.badgeColor,
                      background: activePersona.badgeBg,
                      fontFamily: '"IBM Plex Mono", monospace'
                    }}
                  >
                    <Icon size={12} />
                    {activePersona.role}
                  </span>
                  <h4 className="text-xl sm:text-2xl font-semibold text-[#1F3A5F] leading-snug">
                    {activePersona.headline}
                  </h4>
                  <p className="text-sm leading-relaxed text-[#5B6068] mt-2.5">
                    {activePersona.description}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#1B1F24] font-bold block">
                    Operational Powers &amp; Capabilities:
                  </span>
                  {activePersona.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-[#1B1F24]">
                      <CheckCircle2 size={15} className="text-[#067647] shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Live Desk Simulation Artifact (5 cols) */}
              <div className="lg:col-span-5 rounded-xl border border-[#DAD6CC] bg-[#FAF9F6] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-3 text-xs font-mono">
                  <span className="text-[#5B6068]">Active Case Context</span>
                  <span className="text-[#067647] bg-[#E6F4EC] px-2 py-0.5 rounded font-semibold border border-[#A8E2C2]">
                    Desk Synced
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#DAD6CC] space-y-2">
                  <span className="text-[11px] font-mono text-[#8A4B08] font-bold block">
                    TARGET JURISDICTION ENTITY:
                  </span>
                  <p className="text-xs font-semibold text-[#1B1F24] leading-snug">
                    {activePersona.sampleCase}
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-white border border-[#DAD6CC]">
                    <span className="text-[#5B6068]">Air-Gap Boundary:</span>
                    <span className="font-mono font-bold text-[#067647] flex items-center gap-1">
                      <Lock size={11} /> 100% On-Premise
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-white border border-[#DAD6CC]">
                    <span className="text-[#5B6068]">Audit Hash:</span>
                    <span className="font-mono text-[#1F3A5F] text-[11px]">SHA-256: 7f8b92...</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-mono text-[#5B6068] flex items-center gap-1">
                    <FileCheck size={12} className="text-[#1F3A5F]" />
                    Role-Based Access Control verified under DARPG statutory guidelines
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
