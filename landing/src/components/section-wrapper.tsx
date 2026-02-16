import { cn } from '@/lib/utils'

interface SectionWrapperProps {
  index: number
  children: React.ReactNode
  className?: string
}

/** Applies alternating section background by index. Even = bg-background, odd = bg-muted/30. */
export function SectionWrapper({ index, children, className }: SectionWrapperProps) {
  return (
    <div className={cn(index % 2 === 0 ? 'bg-background' : 'bg-muted/30', className)}>
      {children}
    </div>
  )
}
