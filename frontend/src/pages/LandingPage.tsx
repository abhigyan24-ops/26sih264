/**
 * LandingPage — public promotional page for CaseNexus (SIH 2026, PS SIH26264, Team Mutexia)
 * Route: /landing and unauthenticated root /
 * Features: Lenis buttery inertial smooth scroll, Framer Motion spring progress indicator, ScrollDock
 * Safety contract: makes ZERO API calls.
 */
import { useEffect } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import '@fontsource/ibm-plex-sans/300.css'

import NavBar from '../ui/landing/NavBar'
import HeroSection from '../ui/landing/HeroSection'
import ProblemStrip from '../ui/landing/ProblemStrip'
import PipelineWalkthrough from '../ui/landing/PipelineWalkthrough'
import SolutionLayers from '../ui/landing/SolutionLayers'
import InteractivePersonaDeck from '../ui/landing/InteractivePersonaDeck'
import FeatureGrid from '../ui/landing/FeatureGrid'
import DifferentiatorCards from '../ui/landing/DifferentiatorCards'
import MetricsBar from '../ui/landing/MetricsBar'
import TechStack from '../ui/landing/TechStack'
import LandingFooter from '../ui/landing/LandingFooter'
import ScrollDock from '../ui/landing/ScrollDock'

export default function LandingPage() {
  // Ultra-Smooth Scroll Progress Spring Bar
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  })

  // Lenis Inertial Momentum Scrolling Engine
  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isReduced) return

    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.8,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    const animId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(animId)
      lenis.destroy()
    }
  }, [])

  return (
    <div
      className="min-h-screen relative"
      style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}
    >
      {/* 1. Luminous Precision Scroll Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1F3A5F] via-[#8A4B08] to-[#FFD180] origin-left z-[100]"
        style={{ scaleX }}
      />

      <NavBar />

      <main>
        {/* 2. Hero — tagline, live interactive overlap matcher with rotating radar sweep */}
        <HeroSection />

        {/* 3. Problem — 5 consequences of siloed bureaus with spotlight hover cards */}
        <ProblemStrip />

        {/* 4. Pipeline Walkthrough — 8 steps from intake to active learning (PPT Slide 3) */}
        <PipelineWalkthrough />

        {/* 5. Solution — 4 tactile interactive capability views (Steep style) */}
        <SolutionLayers />

        {/* 6. Persona Experience Deck — RB Officer, PGRC Cell, Regional Desk & Admin */}
        <InteractivePersonaDeck />

        {/* 7. Feature grid — all 8 PS 26264 areas covered with spotlight cards */}
        <FeatureGrid />

        {/* 8. Differentiators — 7 design decisions with pillar cards */}
        <DifferentiatorCards />

        {/* 9. Metrics — empirical benchmarks & Lok Sabha statistics (PPT Slide 5) */}
        <MetricsBar />

        {/* 10. Tech stack — open standards, runs anywhere */}
        <TechStack />
      </main>

      {/* Floating Liquid-Glass Scroll Command Dock */}
      <ScrollDock />

      <LandingFooter />
    </div>
  )
}
