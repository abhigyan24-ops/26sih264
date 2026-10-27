/**
 * LandingPage — public promotional page for CaseNexus (SIH 2026, PS SIH26264, Team Mutexia)
 * Route: /landing (no auth required)
 * Safety contract: makes ZERO API calls. No import from src/api or src/lib/api.
 */
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

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}
    >
      <NavBar />

      <main>
        {/* 1. Hero — tagline, 3-layer pills, live interactive overlap matcher */}
        <HeroSection />

        {/* 2. Problem — 5 consequences of siloed bureaus */}
        <ProblemStrip />

        {/* 3. Pipeline Walkthrough — 8 steps from intake to active learning (PPT Slide 3) */}
        <PipelineWalkthrough />

        {/* 4. Solution — 4 tactile interactive capability views (Steep style) */}
        <SolutionLayers />

        {/* 5. Persona Experience Deck — RB Officer, PGRC Cell, Regional Desk & Admin */}
        <InteractivePersonaDeck />

        {/* 6. Feature grid — all 8 PS 26264 areas covered */}
        <FeatureGrid />

        {/* 7. Differentiators — 7 design decisions */}
        <DifferentiatorCards />

        {/* 8. Metrics — empirical benchmarks & Lok Sabha statistics (PPT Slide 5) */}
        <MetricsBar />

        {/* 9. Tech stack — open standards, runs anywhere */}
        <TechStack />
      </main>

      <LandingFooter />
    </div>
  )
}
