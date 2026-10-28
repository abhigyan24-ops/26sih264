/**
 * NeuralCollisionCanvas — Live Interactive Particle Collision Mesh
 * Visualizes Regulation Bureau (Cobalt) & PGRC (Amber) data streams colliding
 * at the Central Collision Core, with mouse gravity lens & synapse arcs.
 */
import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  stream: 'rb' | 'pgrc'
  alpha: number
  life: number
  maxLife: number
}

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
}

export default function NeuralCollisionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Reduced motion check
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isReduced) return

    let animationFrameId: number
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth)
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600)

    const mouse = { x: -1000, y: -1000, active: false }

    const particles: Particle[] = []
    const ripples: Ripple[] = []
    const MAX_PARTICLES = Math.min(65, Math.floor(width / 22))

    function spawnParticle(stream?: 'rb' | 'pgrc'): Particle {
      const type = stream || (Math.random() > 0.5 ? 'rb' : 'pgrc')
      const isRb = type === 'rb'
      return {
        x: isRb ? Math.random() * (width * 0.4) : width * 0.6 + Math.random() * (width * 0.4),
        y: Math.random() * height,
        vx: isRb ? 0.3 + Math.random() * 0.6 : -(0.3 + Math.random() * 0.6),
        vy: (Math.random() - 0.5) * 0.5,
        radius: 2 + Math.random() * 2.2,
        stream: type,
        alpha: 0.15 + Math.random() * 0.55,
        life: 0,
        maxLife: 300 + Math.random() * 200,
      }
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push(spawnParticle())
    }

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return
      width = canvas.width = canvas.parentElement.clientWidth
      height = canvas.height = canvas.parentElement.clientHeight
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }

    const handleMouseLeave = () => {
      mouse.active = false
    }

    window.addEventListener('resize', handleResize)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    function animate() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      // 1. Draw central collision corridor subtle glow
      const midX = width / 2
      const grad = ctx.createLinearGradient(midX - 100, 0, midX + 100, 0)
      grad.addColorStop(0, 'rgba(31, 58, 95, 0.0)')
      grad.addColorStop(0.5, 'rgba(138, 75, 8, 0.04)')
      grad.addColorStop(1, 'rgba(31, 58, 95, 0.0)')
      ctx.fillStyle = grad
      ctx.fillRect(midX - 120, 0, 240, height)

      // 2. Update and draw ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        r.radius += 1.4
        r.alpha -= 0.02
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1)
          continue
        }
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 209, 128, ${r.alpha})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      // 3. Update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.life++

        // Mouse gravity pull
        if (mouse.active) {
          const dx = mouse.x - p.x
          const dy = mouse.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 180 && dist > 10) {
            const force = (180 - dist) / 1800
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force
          }
        }

        // Apply velocities with dampening
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.vy *= 0.99

        // Respawn when crossing or expiring
        if (p.life > p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          particles[i] = spawnParticle(p.stream)
          continue
        }

        // Render particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        if (p.stream === 'rb') {
          ctx.fillStyle = `rgba(59, 130, 246, ${p.alpha})`
        } else {
          ctx.fillStyle = `rgba(245, 158, 11, ${p.alpha})`
        }
        ctx.fill()
      }

      // 4. Draw synapse lines between opposite stream particles
      const rbParticles = particles.filter((p) => p.stream === 'rb')
      const pgrcParticles = particles.filter((p) => p.stream === 'pgrc')

      for (let i = 0; i < rbParticles.length; i++) {
        const pA = rbParticles[i]
        for (let j = 0; j < pgrcParticles.length; j++) {
          const pB = pgrcParticles[j]
          const dx = pB.x - pA.x
          const dy = pB.y - pA.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 90) {
            const lineAlpha = (1 - dist / 90) * 0.45
            ctx.beginPath()
            ctx.moveTo(pA.x, pA.y)

            // Dynamic curve through center
            const cx = (pA.x + pB.x) / 2
            const cy = (pA.y + pB.y) / 2 + (Math.sin(pA.life * 0.05) * 8)
            ctx.quadraticCurveTo(cx, cy, pB.x, pB.y)

            ctx.strokeStyle = `rgba(217, 119, 6, ${lineAlpha})`
            ctx.lineWidth = 1.1
            ctx.stroke()

            // When particles closely collide, create a collision ripple
            if (dist < 22 && Math.random() < 0.06 && ripples.length < 8) {
              ripples.push({
                x: cx,
                y: cy,
                radius: 4,
                maxRadius: 28,
                alpha: 0.6,
              })
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none md:pointer-events-auto"
      style={{ opacity: 0.85 }}
    />
  )
}
