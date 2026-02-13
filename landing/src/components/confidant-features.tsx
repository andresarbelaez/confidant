import { Card } from '@/components/ui/card'
import { Lock, WifiOff, Heart } from 'lucide-react'

const features = [
  {
    icon: Lock,
    title: 'Privacy first',
    description: 'All processing happens locally. Your conversations never leave your device.',
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    description: 'No internet needed after setup. Use it anywhere, anytime.',
  },
  {
    icon: Heart,
    title: 'Mental health support',
    description: 'Gratitude, mindfulness, mood, stress—a supportive companion, not a substitute for professional care.',
  },
]

export function ConfidantFeatures() {
  return (
    <section id="features" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-balance font-serif text-3xl font-medium sm:text-4xl">Why Confidant?</h2>
          <p className="text-muted-foreground mt-4 text-balance">
            A calm, private space for your mental wellbeing.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} variant="mixed" className="p-6">
              <feature.icon className="size-8 text-muted-foreground mb-4" strokeWidth={1.5} />
              <h3 className="font-medium text-lg">{feature.title}</h3>
              <p className="text-muted-foreground text-sm mt-2">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
