import { Card } from '@/components/ui/card'
import { RiLockFill, RiWifiOffFill, RiHeartFill } from 'react-icons/ri'

const features = [
  {
    icon: RiLockFill,
    title: 'Privacy first',
    description: 'Everything runs on your device. Your conversations stay there.',
  },
  {
    icon: RiWifiOffFill,
    title: 'Works offline',
    description: 'By design, Confidant never interacts with the internet. You can use it any time, anywhere.',
  },
  {
    icon: RiHeartFill,
    title: 'Thoughtful support',
    description: "A space to process what's on your mind, meant to complement — not replace — professional care.",
  },
]

export function ConfidantFeatures() {
  return (
    <section id="features" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-balance font-serif text-3xl font-medium sm:text-4xl">Built for privacy and reflection</h2>
          <p className="text-muted-foreground mt-4 text-balance">
            Designed for reflection, not distraction.
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
