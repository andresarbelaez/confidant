'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

type FadeInUpProps = {
  children: React.ReactNode
  className?: string
  /** Stagger in seconds */
  delay?: number
  /** Initial vertical offset in px */
  y?: number
}

const ease = [0.22, 1, 0.36, 1] as const

export function FadeInUp({ children, className, delay = 0, y = 22 }: FadeInUpProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -48px 0px' }}
      transition={{ duration: 0.52, delay, ease }}
    >
      {children}
    </motion.div>
  )
}
