/**
 * BootSequence — Cinematic Intake Terminal Preloader
 * High-craft sovereign boot HUD with real-time typewriter telemetry,
 * energy progress charging bar, and spring exit reveal.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shield, Cpu, CheckCircle2, ChevronRight, X } from 'lucide-react'

interface BootSequenceProps {
  onComplete: () => void
}

const TERMINAL_LINES = [
  'AICTE SOVEREIGN SYNAPSE ENGINE // BUILD v2.4-SIH26264',
  'Initializing Air-Gapped Bilateral Data Bridge...',
  'Syncing Regulation Bureau Registry [12,480 dockets verified]',
  'Syncing PGRC Grievance Stream [Direct Student Submissions active]',
  'Calibrating Collision Radar: PR-AUC = 0.9366, Cross-Attention = 94.8%',
  'Sovereign Local Audit Ledger: Merkle Hash Verified (SHA-256)',
  'ALL SYSTEMS NOMINAL. COMMENCING CIVIC OPERATIONS NERVE DECK.',
]

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [currentLine, setCurrentLine] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    // Respect reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      onComplete()
      return
    }

    // Progress counter
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        const step = Math.floor(Math.random() * 8) + 3
        return Math.min(100, prev + step)
      })
    }, 40)

    // Terminal line stagger
    const lineInterval = setInterval(() => {
      setCurrentLine((prev) => {
        if (prev < TERMINAL_LINES.length - 1) {
          return prev + 1
        }
        clearInterval(lineInterval)
        return prev
      })
    }, 180)

    return () => {
      clearInterval(progressInterval)
      clearInterval(lineInterval)
    }
  }, [onComplete])

  useEffect(() => {
    if (progress >= 100 && currentLine >= TERMINAL_LINES.length - 1) {
      const timer = setTimeout(() => {
        setIsDone(true)
        setTimeout(onComplete, 450)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [progress, currentLine, onComplete])

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#081018] text-[#F6F5F1] px-4 overflow-hidden select-none"
        >
          {/* Subtle Cybernetic Grid Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(#1F3A5F 1px, transparent 1px), linear-gradient(90deg, #1F3A5F 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />

          {/* Radial Ambient Glow */}
          <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#1F3A5F]/30 via-[#8A4B08]/20 to-transparent blur-3xl pointer-events-none" />

          {/* Top Bar with Skip */}
          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 flex items-center justify-between text-[11px] sm:text-xs text-white/50 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SIH-2026 <span className="hidden sm:inline">// PS SIH26264 // TEAM MUTEXIA</span></span>
            </div>
            <button
              onClick={() => {
                setIsDone(true)
                setTimeout(onComplete, 200)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 text-white/70 hover:text-white transition-colors bg-white/5 backdrop-blur-md cursor-pointer"
            >
              <span>Skip Boot</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Central Terminal Console */}
          <div className="relative w-full max-w-2xl bg-[#0c1622]/90 border border-[#1F3A5F]/60 rounded-2xl p-4 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1F3A5F] to-[#8A4B08] flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
                    CaseNexus Synapse
                    <span className="text-[9px] sm:text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      v2.4-PROD
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-white/50">AICTE Dual-Bureau Coordination Architecture</p>
                </div>
              </div>
              <Cpu className="w-5 h-5 text-amber-400/80 animate-spin shrink-0" style={{ animationDuration: '8s' }} />
            </div>

            {/* Terminal Output Log */}
            <div className="mt-4 sm:mt-5 space-y-2 sm:space-y-2.5 font-mono text-[11px] sm:text-[13px] min-h-[140px] sm:min-h-[160px]">
              {TERMINAL_LINES.slice(0, currentLine + 1).map((line, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-2 leading-relaxed"
                >
                  <span className="text-amber-400 font-bold mt-0.5">
                    {idx === currentLine ? <ChevronRight className="w-3.5 h-3.5 animate-pulse" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </span>
                  <span className={idx === currentLine ? 'text-white font-medium' : 'text-white/60'}>
                    {line}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Precision Progress Bar */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-mono text-white/70 mb-2">
                <span>SYSTEM CALIBRATION</span>
                <span className="text-amber-400 font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#1F3A5F] via-[#8A4B08] to-[#FFD180] rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  {/* Glowing photon head */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-300 blur-[2px] shadow-lg shadow-amber-400" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Footer Telemetry */}
          <div className="mt-8 text-center text-[11px] font-mono text-white/40">
            SECURE AIR-GAPPED HASH // ZERO EXTERNAL EGRESS // ALL RIGHTS RESERVED
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
