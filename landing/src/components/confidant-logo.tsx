import { cn } from '@/lib/utils'

export function ConfidantLogo({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold text-lg tracking-tight', className)}>
      Confidant
    </span>
  )
}
