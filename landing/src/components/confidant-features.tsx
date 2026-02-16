import { Card } from '@/components/ui/card'
import { RiLockFill, RiWifiOffFill, RiHeartFill } from 'react-icons/ri'

const features = [
  {
    icon: RiLockFill,
    title: 'Free & private',
    description: 'No subscription or account. Everything stays on your device—nothing uploaded or stored online.',
  },
  {
    icon: RiWifiOffFill,
    title: 'Use it anywhere',
    description: 'Works offline. No internet required—by design.',
  },
  {
    icon: RiHeartFill,
    title: 'Thoughtful support',
    description: "A companion for what's on your mind. Meant to complement, not replace, professional care.",
  },
]

export function ConfidantFeatures() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-left md:text-center mb-16">
          <h2 className="text-balance font-serif text-4xl font-medium sm:text-5xl">Built for privacy and reflection</h2>
          <p className="text-muted-foreground mt-4 text-balance">
            Privacy, offline use, and a space to reflect.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} variant="mixed" className="p-6 bg-warm-100 dark:bg-neutral-900/30 border-border">
              <feature.icon className="size-8 text-primary mb-4" />
              <h3 className="font-medium text-lg">{feature.title}</h3>
              <p className="text-muted-foreground text-sm mt-2">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
