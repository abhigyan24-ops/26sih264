/**
 * MarqueeTicker — Live Sovereign Telemetry Ticker Tape
 * Smooth continuous marquee streaming real-time statutory filings,
 * collision detections, and autonomous SLA alerts across AICTE bureaus.
 */
import { useState } from 'react'
import { AlertTriangle, CheckCircle, Shield, GitMerge, Radio } from 'lucide-react'

interface TelemetryEvent {
  id: string
  type: 'collision' | 'sla' | 'audit' | 'intake'
  tag: string
  time: string
  message: string
}

const EVENTS: TelemetryEvent[] = [
  {
    id: 'e1',
    type: 'collision',
    tag: 'CROSS-BUREAU COLLISION',
    time: '2.1s ago',
    message: 'RB Docket #2026-8812 & PGRC #14902 matched with 94.8% semantic cosine similarity (College #1092)',
  },
  {
    id: 'e2',
    type: 'sla',
    tag: 'SLA HORIZON ALERT',
    time: '5.4s ago',
    message: 'Autonomous SLA escalation: Inquiry Docket #RB-4411 within 48h of 21-day statutory ceiling',
  },
  {
    id: 'e3',
    type: 'audit',
    tag: 'MERKLE COMMIT',
    time: '8.7s ago',
    message: 'Block #4892 committed to air-gapped ledger: SHA-256 e3b0c44298fc1c149afbf4c8996fb924',
  },
  {
    id: 'e4',
    type: 'intake',
    tag: 'OMNICHANNEL INTAKE',
    time: '12.0s ago',
    message: 'PGRC Student Portal: Verified intake for Western Regional Office (Faculty Ratio Deficiency)',
  },
  {
    id: 'e5',
    type: 'collision',
    tag: 'SYNAPSE DOCKET UNIFICATION',
    time: '15.2s ago',
    message: 'Joint inquiry panel convened for Institution #2284: Regulation Bureau + PGRC Cell',
  },
  {
    id: 'e6',
    type: 'audit',
    tag: 'DATA SANITIZATION',
    time: '19.8s ago',
    message: 'Autonomous Aadhaar / PAN PII masking applied on incoming grievance attachments [0 leaks]',
  },
]

export default function MarqueeTicker() {
  const [filter, setFilter] = useState<'all' | 'collision' | 'sla' | 'audit'>('all')

  const filteredEvents = filter === 'all' ? EVENTS : EVENTS.filter((e) => e.type === filter)
  // Double the list for infinite loop effect
  const displayEvents = [...filteredEvents, ...filteredEvents]

  const handleFilterClick = (f: 'all' | 'collision' | 'sla' | 'audit') => {
    setFilter(f)
  }

  return (
    <div className="w-full bg-[#0d1824] border-y border-[#1F3A5F]/40 py-3 relative overflow-hidden select-none">
      {/* Top Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-mono tracking-wider text-amber-300 font-semibold uppercase truncate">
            Live Sovereign Telemetry Stream
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-[10px] overflow-x-auto max-w-full pb-0.5 scrollbar-none">
          <button
            onClick={() => handleFilterClick('all')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer shrink-0 ${
              filter === 'all' ? 'bg-[#1F3A5F] text-white' : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => handleFilterClick('collision')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer shrink-0 ${
              filter === 'collision' ? 'bg-amber-600/80 text-white' : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            COLLISIONS
          </button>
          <button
            onClick={() => handleFilterClick('sla')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer shrink-0 ${
              filter === 'sla' ? 'bg-rose-600/80 text-white' : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            SLA ALERTS
          </button>
          <button
            onClick={() => handleFilterClick('audit')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer shrink-0 ${
              filter === 'audit' ? 'bg-emerald-600/80 text-white' : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            AUDIT TRAIL
          </button>
        </div>
      </div>

      {/* Marquee Track Container */}
      <div className="relative w-full overflow-hidden group">
        {/* Left & Right gradient edge fades */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0d1824] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0d1824] to-transparent z-10 pointer-events-none" />

        {/* Marquee Inner Flex */}
        <div className="flex items-center gap-6 whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused]">
          {displayEvents.map((evt, idx) => {
            const isCollision = evt.type === 'collision'
            const isSla = evt.type === 'sla'
            const isAudit = evt.type === 'audit'

            return (
              <div
                key={`${evt.id}-${idx}`}
                className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-mono text-white/80"
              >
                {isCollision && <GitMerge className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                {isSla && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                {isAudit && <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                {!isCollision && !isSla && !isAudit && <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />}

                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isCollision
                      ? 'bg-amber-500/20 text-amber-300'
                      : isSla
                      ? 'bg-rose-500/20 text-rose-300'
                      : isAudit
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {evt.tag}
                </span>

                <span className="text-white/90">{evt.message}</span>
                <span className="text-white/40 text-[10px]">({evt.time})</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
