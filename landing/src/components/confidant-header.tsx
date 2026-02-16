'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { scrollToHash } from '@/lib/scroll-to-hash'
import React from 'react'
import { cn } from '@/lib/utils'
import { ConfidantLogo } from './confidant-logo'

const REPO = 'https://github.com/andresarbelaez/confidant'

const menuItems = [
  { name: 'Philosophy', href: '#philosophy' },
  { name: 'Features', href: '#features' },
  { name: 'Try it yourself', href: '#try-it-yourself' },
  { name: 'GitHub', href: REPO, external: true },
]

export function ConfidantHeader() {
  const [menuState, setMenuState] = React.useState(false)

  return (
    <header>
      <nav className="fixed z-20 w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" aria-label="Confidant home" className="flex items-center">
              <ConfidantLogo />
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {menuItems.map((item) => (
                <Button key={item.name} asChild variant="ghost" size="sm">
                  <Link
                    href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    {...(item.href.startsWith('#') ? { onClick: (e) => scrollToHash(e, item.href) } : {})}
                  >
                    {item.name}
                  </Link>
                </Button>
              ))}
              <Button asChild size="sm" className="ml-2">
                <Link href="#download" onClick={(e) => scrollToHash(e, '#download')}>Download</Link>
              </Button>
            </div>
            <button
              onClick={() => setMenuState(!menuState)}
              aria-label={menuState ? 'Close menu' : 'Open menu'}
              className="md:hidden p-2 -mr-2"
            >
              {menuState ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
          {menuState && (
            <div className="md:hidden py-4 border-t border-border space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  {...(item.href.startsWith('#') ? { onClick: (e) => { scrollToHash(e, item.href); setMenuState(false) } } : { onClick: () => setMenuState(false) })}
                  className="block py-2 text-muted-foreground hover:text-foreground"
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="#download"
                onClick={(e) => {
                  scrollToHash(e, '#download')
                  setMenuState(false)
                }}
                className="block py-2 text-muted-foreground hover:text-foreground"
              >
                Download
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
