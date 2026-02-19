import type { ReactNode } from 'react'

export interface SidebarItem {
  label: string
  /** Optional icon (desktop settings use this; TOC links often omit it). */
  icon?: ReactNode
  /** If set, item is an anchor; otherwise a button. */
  href?: string
  onClick?: () => void
}

export interface ChatSidebarShellProps {
  items: SidebarItem[]
  'aria-label'?: string
  /** Optional header: image URL (string) or React node (e.g. SVG logo). Rendered as a small circle to the left of the label. */
  headerLogo?: string | ReactNode
  /** Header text; defaults to "Confidant". */
  headerLabel?: string
  /** When set, the item whose href matches (e.g. "#typography") gets a selected/active style. Use for TOC with scroll spy. */
  activeHref?: string
}

/** Shared sidebar: same look in desktop app and design-system page. Fixed header (logo + label) plus nav items. */
export function ChatSidebarShell({
  items,
  'aria-label': ariaLabel,
  headerLogo,
  headerLabel = 'Confidant',
  activeHref,
}: ChatSidebarShellProps) {
  return (
    <nav className="chat-sidebar" aria-label={ariaLabel ?? 'Chat and account'}>
      <div className="sidebar-header">
        <div className="sidebar-header-logo">
          {headerLogo == null ? (
            <span className="sidebar-header-logo-placeholder" aria-hidden />
          ) : typeof headerLogo === 'string' ? (
            <img src={headerLogo} alt="" className="sidebar-header-logo-img" />
          ) : (
            headerLogo
          )}
        </div>
        <span className="sidebar-header-label">{headerLabel}</span>
      </div>
      <div className="sidebar-content">
        {items.map((item, idx) => {
          const key = item.href ?? idx
          const isActive = activeHref != null && item.href === activeHref
          const className = 'sidebar-settings-label' + (isActive ? ' sidebar-settings-label-active' : '')
          const content = (
            <>
              {item.icon != null && (
                <span className="sidebar-settings-icon" aria-hidden>
                  {item.icon}
                </span>
              )}
              {item.label}
            </>
          )
          if (item.href != null) {
            return (
              <a key={key} href={item.href} className={className} aria-current={isActive ? 'location' : undefined}>
                {content}
              </a>
            )
          }
          return (
            <button
              key={key}
              type="button"
              className={className}
              onClick={item.onClick ?? undefined}
            >
              {content}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
