import type { ReactNode } from 'react'

export interface SidebarItem {
  label: string
  icon: ReactNode
  onClick?: () => void
}

interface ChatSidebarShellProps {
  items: SidebarItem[]
  'aria-label'?: string
}

/** Presentational sidebar: same look as desktop chat sidebar. Buttons with no onClick are no-ops. */
export function ChatSidebarShell({ items, 'aria-label': ariaLabel }: ChatSidebarShellProps) {
  return (
    <nav className="chat-sidebar" aria-label={ariaLabel ?? 'Chat and account'}>
      <div className="sidebar-content">
        {items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className="sidebar-settings-label"
            onClick={item.onClick ?? undefined}
          >
            <span className="sidebar-settings-icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
