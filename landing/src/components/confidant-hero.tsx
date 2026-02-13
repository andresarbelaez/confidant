import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { ConfidantHeader } from './confidant-header'

export function ConfidantHero() {
  return (
    <>
      <ConfidantHeader />
      <main>
        <section className="bg-background pt-32 pb-24 md:pt-40 md:pb-32">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h1 className="text-balance font-serif text-4xl font-medium sm:text-5xl md:text-6xl">
              Your mental health companion. Fully offline. Fully private.
            </h1>
            <p className="text-muted-foreground mt-6 text-lg text-balance">
              Support for gratitude, mindfulness, mood, stress, and more—with an AI that runs entirely on your device. No account. Nothing leaves your computer.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="pr-2">
                <Link href="#download">
                  Download for free
                  <ChevronRight className="ml-1 size-4 opacity-70" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="https://github.com/andresarbelaez/confidant#readme" target="_blank" rel="noopener">
                  Learn more
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
