import { CampaignHeader } from "@/components/campaign/CampaignHeader";
import { HeroSection } from "@/components/campaign/HeroSection";
import { ReaderProblemSection } from "@/components/campaign/ReaderProblemSection";
import { SilverCycleSection } from "@/components/campaign/SilverCycleSection";
import { SilverBenefitsSection } from "@/components/campaign/SilverBenefitsSection";
import { ReaderFitSection } from "@/components/campaign/ReaderFitSection";
import { TestimonialsSection } from "@/components/campaign/TestimonialsSection";
import { GiftSection } from "@/components/campaign/GiftSection";
import { FeaturedBookSection } from "@/components/campaign/FeaturedBookSection";
import { ReadingEssentialsSection } from "@/components/campaign/ReadingEssentialsSection";
import { FAQSection } from "@/components/campaign/FAQSection";
import { FinalConversionSection } from "@/components/campaign/FinalConversionSection";
import { CampaignFooter } from "@/components/campaign/CampaignFooter";
import { publishedFaqs } from "@/config/faqs";
import { DeferredArtLoader } from "@/lib/media/DeferredArtLoader";
import { buildStructuredData, serializeJsonLd } from "@/lib/seo/structuredData";

/** Section order is locked by the campaign architecture. */
export default function CampaignPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildStructuredData(publishedFaqs)) }}
      />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <CampaignHeader />
      <main id="main">
        <HeroSection />
        <ReaderProblemSection />
        <SilverCycleSection />
        <SilverBenefitsSection />
        <ReaderFitSection />
        <TestimonialsSection />
        <GiftSection />
        <FeaturedBookSection />
        <ReadingEssentialsSection />
        <FAQSection />
        <FinalConversionSection />
      </main>
      <CampaignFooter />
      <DeferredArtLoader />
    </>
  );
}
