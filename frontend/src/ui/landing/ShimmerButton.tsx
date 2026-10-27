import { motion } from 'motion/react'

interface ShimmerButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: 'primary' | 'secondary'
}

export default function ShimmerButton({
  children,
  onClick,
  className = '',
  variant = 'primary',
}: ShimmerButtonProps) {
  if (variant === 'secondary') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={`relative inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-xs font-semibold text-[#1B1F24] bg-white border border-[#DAD6CC] shadow-xs hover:bg-[#FAF9F6] transition-colors cursor-pointer ${className}`}
      >
        {children}
      </motion.button>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-lg p-[1px] font-semibold text-xs cursor-pointer shadow-md ${className}`}
    >
      {/* Animated rotating shimmer gradient border */}
      <span className="absolute inset-[-1000%] animate-[spin_3.5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#1F3A5F_0%,#FFD180_50%,#1F3A5F_100%)]" />

      {/* Button Body with subtle inner shadow */}
      <span className="relative flex h-full w-full items-center justify-center gap-2 rounded-[7px] bg-[#1F3A5F] px-5 py-2.5 text-white transition-all hover:bg-[#17304F]">
        {children}
      </span>
    </motion.button>
  )
}
