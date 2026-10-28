/**
 * TiltCard — 3D Perspective Card with Dynamic Specular Glare
 * Renders subtle spring-damped tilt & traveling specular lighting.
 */
import { useRef, useState } from 'react'
import { motion, useSpring } from 'motion/react'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  maxTilt?: number // degrees
}

export default function TiltCard({
  children,
  className = '',
  maxTilt = 7,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })

  const springConfig = { stiffness: 300, damping: 25 }
  const rotateX = useSpring(0, springConfig)
  const rotateY = useSpring(0, springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height

    const tiltX = (py - 0.5) * -maxTilt * 2
    const tiltY = (px - 0.5) * maxTilt * 2

    rotateX.set(tiltX)
    rotateY.set(tiltY)
    setGlare({ x: px * 100, y: py * 100, opacity: 0.15 })
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
    setGlare((prev) => ({ ...prev, opacity: 0 }))
  }

  return (
    <div style={{ perspective: 1000 }} className="h-full">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative h-full transition-shadow duration-300 ${className}`}
      >
        {children}

        {/* Dynamic Specular Glare Overlay */}
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300"
          style={{
            opacity: glare.opacity,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.22) 0%, transparent 65%)`,
          }}
        />
      </motion.div>
    </div>
  )
}
