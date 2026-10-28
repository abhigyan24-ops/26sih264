/**
 * MagneticWrapper — Physics-based magnetic attraction for high-priority CTAs
 * Pulls elements smoothly toward cursor within a trigger radius, snapping back on exit.
 */
import { useRef, useState } from 'react'
import { motion, useSpring } from 'motion/react'

interface MagneticWrapperProps {
  children: React.ReactNode
  className?: string
  strength?: number // 0.1 to 0.5
  radius?: number
}

export default function MagneticWrapper({
  children,
  className = '',
  strength = 0.3,
  radius = 60,
}: MagneticWrapperProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const springConfig = { stiffness: 350, damping: 20, mass: 0.5 }
  const x = useSpring(0, springConfig)
  const y = useSpring(0, springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distX = e.clientX - centerX
    const distY = e.clientY - centerY
    const distance = Math.sqrt(distX * distX + distY * distY)

    if (distance < radius) {
      x.set(distX * strength)
      y.set(distY * strength)
      setIsHovered(true)
    } else {
      x.set(0)
      y.set(0)
      setIsHovered(false)
    }
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
    setIsHovered(false)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      className={`block sm:inline-block ${className} ${isHovered ? 'cursor-pointer' : ''}`}
    >
      {children}
    </motion.div>
  )
}
