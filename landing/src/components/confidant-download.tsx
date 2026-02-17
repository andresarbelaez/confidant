'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

const REPO = 'https://github.com/andresarbelaez/confidant'

const downloads = [
  { label: 'macOS (Apple Silicon)', file: 'Confidant_0.1.0_aarch64.dmg', logo: 'apple-logo.png', eventPath: 'download-macos-arm' },
  { label: 'Windows (MSI)', file: 'Confidant_0.1.0_x64_en-US.msi', logo: 'windows-logo.png', eventPath: 'download-windows-msi' },
  { label: 'macOS (Intel)', file: 'Confidant_0.1.0_x64.dmg', logo: 'apple-logo.png', eventPath: 'download-macos-intel' },
  { label: 'Windows (EXE)', file: 'Confidant_0.1.0_x64_en-US-setup.exe', logo: 'windows-logo.png', eventPath: 'download-windows-exe' },
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
        <h2 className="text-balance font-serif text-4xl font-medium sm:text-5xl text-left md:text-center">Download</h2>
        <div className="text-muted-foreground text-left md:text-center mt-4 mb-12">
          <p>Free for macOS 11+ and Windows 10+. No account required.</p>
          <p className="md:hidden text-sm mt-2 px-4">
            On a phone or tablet? Confidant is a desktop app. Use a Mac or Windows PC to download.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {downloads.map((d) => (
            <Button
              key={d.label}
              asChild
              variant="outline"
              className="h-auto w-full justify-start gap-4 py-4 px-6 rounded-2xl bg-muted border border-border ring-0 transition-colors text-left"
            >
              <Link
                href={`${REPO}/releases/latest/download/${d.file}`}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.goatcounter?.count) {
                    window.goatcounter.count({ path: d.eventPath, title: d.label, event: true })
                  }
                }}
              >
                <div className="w-10 h-10 shrink-0 flex items-center justify-center text-2xl text-muted-foreground">
                  <PlatformLogo src={`/${d.logo}`} alt="" />
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
        
        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-left md:text-center text-sm">
          <strong>Confidant is currently in Beta.</strong> We'd love your feedback—{' '}
          <Link href={`${REPO}/issues`} className="underline hover:no-underline">share it on GitHub</Link>.
        </div>
        <h3 className="text-sm font-medium text-foreground mt-8 mb-2 text-left md:text-center">About security warnings</h3>
        <p className="text-muted-foreground text-sm text-left md:text-center">
          Beta builds are unsigned. macOS may say the app is &quot;damaged&quot;—it isn&apos;t; right‑click the app → Open, then click Open again.{' '}
          <Link href={`${REPO}#readme`} className="underline hover:no-underline">More ways to open unsigned apps</Link>.
        </p>
      </div>
    </section>
  )
}
