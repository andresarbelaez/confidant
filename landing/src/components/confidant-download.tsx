'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

const REPO = 'https://github.com/andresarbelaez/confidant'

const downloads = [
  { label: 'macOS (Apple Silicon)', file: 'Confidant_0.1.0_aarch64.dmg', logo: 'apple-logo.png' },
  { label: 'Windows (MSI)', file: 'Confidant_0.1.0_x64_en-US.msi', logo: 'windows-logo.png' },
  { label: 'macOS (Intel)', file: 'Confidant_0.1.0_x64.dmg', logo: 'apple-logo.png' },
  { label: 'Windows (EXE)', file: 'Confidant_0.1.0_x64_en-US-setup.exe', logo: 'windows-logo.png' },
]

function PlatformLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="shrink-0 object-contain w-10 h-10"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
        const fallback = e.currentTarget.nextElementSibling
        if (fallback) (fallback as HTMLElement).style.display = 'flex'
      }}
    />
  )
}

export function ConfidantDownload() {
  return (
    <section id="download" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-balance font-serif text-3xl font-medium sm:text-4xl text-center">Download</h2>
        <p className="text-muted-foreground text-center mt-4 mb-12">
          Free for macOS 11+ and Windows 10+. No account required.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {downloads.map((d) => (
            <Button
              key={d.label}
              asChild
              variant="outline"
              className="h-auto w-full justify-start gap-4 py-4 px-6 rounded-2xl bg-muted border border-border ring-0 transition-colors text-left"
            >
              <Link href={`${REPO}/releases/latest/download/${d.file}`}>
                <div className="w-10 h-10 shrink-0 flex items-center justify-center text-2xl text-muted-foreground">
                  <PlatformLogo src={`/confidant/${d.logo}`} alt="" />
                  <span style={{ display: 'none' }}>{d.logo.includes('apple') ? '🍎' : '🪟'}</span>
                </div>
                <div className="flex flex-col items-start gap-0">
                  <span className="font-medium">{d.label}</span>
                  <span className="text-muted-foreground text-sm">.{d.file.split('.').pop()}</span>
                </div>
              </Link>
            </Button>
          ))}
        </div>
        
        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center text-sm">
          <strong>Confidant is currently in Beta.</strong> We'd love your feedback.{' '}
          <Link href={`${REPO}/issues`} className="underline hover:no-underline">Share feedback on GitHub</Link>.
        </div>
        <p className="text-muted-foreground text-sm text-center mt-8">
          Beta builds are unsigned. You may see a security or Gatekeeper warning;{' '}
          <Link href={`${REPO}#readme`} className="underline hover:no-underline">see how to open unsigned apps</Link>.
        </p>
      </div>
    </section>
  )
}
