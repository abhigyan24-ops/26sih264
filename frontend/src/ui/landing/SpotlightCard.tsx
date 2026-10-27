import { useState, useRef } from 'react'
import { useReducedMotion } from 'motion/react'

interface SpotlightCardProps {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
  borderColor?: string
}

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(31, 58, 95, 0.08)',
  borderColor = 'rgba(218, 214, 204, 0.8)',
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)
  const prefersReduced = useReducedMotion()

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || prefersReduced) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleMouseEnter = () => {
    if (prefersReduced) return
    setOpacity(1)
  }

  const handleMouseLeave = () => {
    setOpacity(0)
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${className}`}
      style={{
        borderColor: borderColor,
        background: '#FFFFFF',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Dynamic Cursor Spotlight Gradient */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
        aria-hidden="true"
      />
      
      {/* Card Content with subtle specular edge */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
