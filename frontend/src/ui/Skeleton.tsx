import type React from 'react'
import { cn } from './utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-[#EFEDE7] rounded-[4px] motion-safe:animate-pulse',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  )
}
