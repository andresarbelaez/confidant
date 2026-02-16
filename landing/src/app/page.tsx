import { SectionWrapper } from '@/components/section-wrapper'
import { ConfidantHero } from '@/components/confidant-hero'
import { ConfidantPhilosophy } from '@/components/confidant-philosophy'
import { ConfidantFeatures } from '@/components/confidant-features'
import { ConfidantChatPreview } from '@/components/confidant-chat-preview'
import { ConfidantDownload } from '@/components/confidant-download'
import { ConfidantFooter } from '@/components/confidant-footer'

export default function Home() {
  return (
    <div className="min-h-screen">
      <SectionWrapper index={0}>
        <ConfidantHero />
      </SectionWrapper>
      <SectionWrapper index={1}>
        <ConfidantPhilosophy />
      </SectionWrapper>
      <SectionWrapper index={2}>
        <ConfidantFeatures />
      </SectionWrapper>
      <SectionWrapper index={3}>
        <ConfidantChatPreview />
      </SectionWrapper>
      <SectionWrapper index={4}>
        <ConfidantDownload />
      </SectionWrapper>
      <SectionWrapper index={5}>
        <ConfidantFooter />
      </SectionWrapper>
    </div>
  )
}
