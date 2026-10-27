import { motion, useReducedMotion } from 'motion/react'

export default function AnimatedBeam() {
  const prefersReduced = useReducedMotion()

  return (
    <div className="relative w-full py-4 flex items-center justify-between">
      {/* SVG Canvas for connecting beam */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 400 60"
      >
        <defs>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1F3A5F" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#8A4B08" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1F3A5F" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Base Track */}
        <path
          d="M 60 30 L 200 30 L 340 30"
          fill="none"
          stroke="#DAD6CC"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Animated Synapse Pulse Beam */}
        {!prefersReduced && (
          <motion.path
            d="M 60 30 L 200 30 L 340 30"
            fill="none"
            stroke="url(#beamGradient)"
            strokeWidth="3"
            strokeDasharray="40 120"
            animate={{
              strokeDashoffset: [-160, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}
      </svg>
    </div>
  )
}
