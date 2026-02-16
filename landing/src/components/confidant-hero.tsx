'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { scrollToHash } from '@/lib/scroll-to-hash'
import { ChevronRight } from 'lucide-react'
import { ConfidantHeader } from './confidant-header'

export function ConfidantHero() {
  return (
    <>
      <ConfidantHeader />
      <main>
        <section className="pt-32 pb-24 md:pt-40 md:pb-32">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h1 className="text-balance font-serif text-4xl font-medium leading-[1.3] sm:text-5xl md:text-6xl">
              Confidant is a private AI companion for your mental health. It runs entirely on your device.
            </h1>
            <p className="text-muted-foreground mt-6 text-lg text-balance">
              Because your thoughts deserve to be heard, not stored.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="pr-2">
                <Link href="#download" onClick={(e) => scrollToHash(e, '#download')}>
                  Download for free
                  <ChevronRight className="ml-1 size-4 opacity-70" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="https://github.com/andresarbelaez/confidant#readme" target="_blank" rel="noopener">
                  View on GitHub
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
