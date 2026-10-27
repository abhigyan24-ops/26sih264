/**
 * Civic Ledger Motion Tokens (Section 4.5)
 * Durations: 120ms (hover/press), 200ms (appear), 320ms (dialog/sheet/page)
 * Easing: ease-out for entering, ease-in for leaving.
 * Reduced motion: replace transforms with opacity-only fades.
 */

export const MOTION = {
  durations: {
    fast: 0.12, // 120 ms
    normal: 0.2, // 200 ms
    slow: 0.32, // 320 ms
  },
  easings: {
    easeOut: [0.16, 1, 0.3, 1] as const,
    easeIn: [0.7, 0, 0.84, 0] as const,
    easeInOut: [0.65, 0, 0.35, 1] as const,
  },
}

export const fadeInVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: MOTION.durations.normal, ease: MOTION.easings.easeOut } },
  exit: { opacity: 0, transition: { duration: MOTION.durations.fast, ease: MOTION.easings.easeIn } },
}

export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03, // 30 ms stagger
      delayChildren: 0.05,
    },
  },
}

export const staggerItemVariants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION.durations.normal, ease: MOTION.easings.easeOut },
  },
}

export const dialogMotionVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: MOTION.durations.slow, ease: MOTION.easings.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: MOTION.durations.fast, ease: MOTION.easings.easeIn },
  },
}
