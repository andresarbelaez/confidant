import type { ReactNode } from 'react'

interface ChatLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  className?: string
}

/** Flex layout: sidebar + main area. Uses .chat-interface and .chat-main class names. */
export function ChatLayout({ sidebar, children, className }: ChatLayoutProps) {
  return (
    <div className={`chat-interface ${className ?? ''}`.trim()}>
      {sidebar}
      <div className="chat-main">{children}</div>
    </div>
  )
}
