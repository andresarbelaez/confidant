import { ConfidantHero } from '@/components/confidant-hero'
import { ConfidantFeatures } from '@/components/confidant-features'
import { ConfidantDownload } from '@/components/confidant-download'
import { ConfidantFooter } from '@/components/confidant-footer'

export default function Home() {
  return (
    <div className="min-h-screen">
      <ConfidantHero />
      <ConfidantFeatures />
      <ConfidantDownload />
      <ConfidantFooter />
    </div>
  )
}
