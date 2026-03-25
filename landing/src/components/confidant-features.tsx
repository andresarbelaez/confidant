import { FadeInUp } from '@/components/fade-in-up'
import { Card } from '@/components/ui/card'
import { RiLockFill, RiWifiOffFill, RiHeartFill } from 'react-icons/ri'

const features = [
  {
    icon: RiHeartFill,
    title: 'Thoughtful support',
    description: "A companion for what's on your mind. Meant to complement, not replace, professional care.",
  },
  {
    icon: RiWifiOffFill,
    title: 'Use it anywhere',
    description: 'After you download Confidant, it works completely offline. No internet connection is required.',
  },
  {
    icon: RiLockFill,
    title: 'Free & private',
    description: 'No subscription or account. Everything stays on your device—nothing is uploaded or stored online.',
  },
]

export function ConfidantFeatures() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <FadeInUp className="mb-16 text-left">
          <h2 className="text-balance font-serif text-4xl font-medium sm:text-5xl">What you can count on</h2>
          <p className="text-muted-foreground mt-4 text-balance">
            A space to reflect that is always offline and privacy-first.
          </p>
        </FadeInUp>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <FadeInUp key={feature.title} delay={0.06 + i * 0.07}>
              <Card variant="mixed" className="h-full p-6 bg-warm-100 border-border">
                <feature.icon className="size-8 text-primary mb-4" />
                <h3 className="font-medium text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-sm mt-2">{feature.description}</p>
              </Card>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  )
}
