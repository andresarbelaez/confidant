import Link from 'next/link'
import { Card } from '@/components/ui/card'

const REPO = 'https://github.com/andresarbelaez/confidant'

const downloads = [
  { label: 'macOS (Apple Silicon)', file: 'Confidant_0.1.0_aarch64.dmg', icon: '🍎' },
  { label: 'macOS (Intel)', file: 'Confidant_0.1.0_x64.dmg', icon: '🖥️' },
  { label: 'Windows (MSI)', file: 'Confidant_0.1.0_x64_en-US.msi', icon: '🪟' },
  { label: 'Windows (EXE)', file: 'Confidant_0.1.0_x64_en-US-setup.exe', icon: '🪟' },
]

export function ConfidantDownload() {
  return (
    <section id="download" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-balance font-serif text-3xl font-medium sm:text-4xl text-center">Download</h2>
        <p className="text-muted-foreground text-center mt-4 mb-12">
          macOS 11+ · Windows 10+
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {downloads.map((d) => (
            <Link
              key={d.label}
              href={`${REPO}/releases/latest/download/${d.file}`}
              className="block"
            >
              <Card
                variant="mixed"
                className="p-6 flex items-center gap-4 hover:bg-muted/50 transition-colors"
              >
                <span className="text-2xl">{d.icon}</span>
                <div>
                  <span className="font-medium">{d.label}</span>
                  <span className="text-muted-foreground text-sm block">{d.file.split('.').pop()}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
        <p className="text-muted-foreground text-sm text-center mt-8">
          Beta builds are unsigned. You may see a security or Gatekeeper warning; see the{' '}
          <Link href={`${REPO}#readme`} className="underline hover:no-underline">README</Link> for details.
        </p>
        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center text-sm">
          <strong>Beta.</strong> We'd love your feedback.{' '}
          <Link href={`${REPO}/issues`} className="underline hover:no-underline">Open an issue</Link> or start a discussion.
        </div>
      </div>
    </section>
  )
}
