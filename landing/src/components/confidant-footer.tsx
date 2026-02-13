import Link from 'next/link'
import { ConfidantLogo } from './confidant-logo'

const REPO = 'https://github.com/andresarbelaez/confidant'

const links = [
  { label: 'Source', href: REPO },
  { label: 'License', href: `${REPO}/blob/main/LICENSE` },
  { label: 'Contributing', href: `${REPO}/blob/main/CONTRIBUTING.md` },
]

export function ConfidantFooter() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto max-w-3xl px-6">
        <div className="flex flex-col items-center gap-6">
          <Link href="/" aria-label="Confidant home">
            <ConfidantLogo />
          </Link>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            Confidant is not a substitute for therapy or professional mental health care.
          </p>
          <nav className="flex gap-6">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-muted-foreground text-xs">&copy; {new Date().getFullYear()} Confidant</p>
        </div>
      </div>
    </footer>
  )
}
