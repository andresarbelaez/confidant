import { FadeInUp } from '@/components/fade-in-up'

export function ConfidantPhilosophy() {
  return (
    <section id="philosophy" className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <FadeInUp>
          <h2 className="text-balance font-serif text-4xl font-medium sm:text-5xl text-left">
            Our philosophy
          </h2>
        </FadeInUp>
        <FadeInUp delay={0.07} className="mt-6">
          <p className="text-foreground text-xl font-medium text-balance text-left">
            We believe everyone deserves access to a supportive AI companion—without paying for it
            or surrendering your privacy.
          </p>
        </FadeInUp>

        <FadeInUp delay={0.12} className="mt-10">
          <div className="space-y-5 text-muted-foreground text-lg text-balance text-left">
            <p>
              Basic mental health support shouldn&apos;t require a subscription or trust a company with
              your most personal conversations.
            </p>
            <p>
              Confidant runs entirely on your device. Nothing is uploaded. Nothing is stored online.
            </p>
            <p className="mt-8 font-semibold text-foreground">Your thoughts stay yours.</p>
          </div>
        </FadeInUp>
      </div>
    </section>
  )
}
