import Head from 'next/head'
import { withBasePath } from '@/lib/base-path'
import KelmaWidget from '@/components/KelmaWidget'
import Nav from '@/components/landing/Nav'
import Hero from '@/components/landing/Hero'
import TrustStrip from '@/components/landing/TrustStrip'
import PriceCompare from '@/components/landing/PriceCompare'
import Medicine from '@/components/landing/Medicine'
import FeaturesBento from '@/components/landing/FeaturesBento'
import HowItWorks from '@/components/landing/HowItWorks'
import Screenshots from '@/components/landing/Screenshots'
import Pricing from '@/components/landing/Pricing'
import Faq from '@/components/landing/Faq'
import Privacy from '@/components/landing/Privacy'
import FinalCta from '@/components/landing/FinalCta'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>ClanKeep — Together. Organised. At home.</title>
        <meta
          name="description"
          content="The private household HQ: shared shopping with Malta supermarket price comparison, meal planning, chores, medicine schedules with reminders, and notes — all in one private home."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href={withBasePath('/logo.png')} />
      </Head>

      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main>
          <Hero />
          <TrustStrip />
          <FeaturesBento />
          <PriceCompare />
          <Medicine />
          <HowItWorks />
          <Screenshots />
          <Pricing />
          <Faq />
          <Privacy />
          <FinalCta />
        </main>
        <Footer />
      </div>

      <KelmaWidget />
    </>
  )
}
