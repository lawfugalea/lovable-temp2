import Head from 'next/head'
import { withBasePath } from '@/lib/base-path'
import KelmaWidget from '@/components/KelmaWidget'
import PublicTracking from '@/components/PublicTracking'
import Nav from '@/components/landing/Nav'
import Hero from '@/components/landing/Hero'
import TrustStrip from '@/components/landing/TrustStrip'
import Medicine from '@/components/landing/Medicine'
import FeaturesBento from '@/components/landing/FeaturesBento'
import HowItWorks from '@/components/landing/HowItWorks'
import Screenshots from '@/components/landing/Screenshots'
import Pipeline from '@/components/landing/Pipeline'
import Pricing from '@/components/landing/Pricing'
import Faq from '@/components/landing/Faq'
import Privacy from '@/components/landing/Privacy'
import FinalCta from '@/components/landing/FinalCta'
import Footer from '@/components/landing/Footer'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://clankeep.com'
const OG_IMAGE = `${SITE_URL}${withBasePath('/og-image.png')}`
const DESCRIPTION =
  'The private household HQ: shared shopping lists, meal planning, chores, medicine schedules with reminders, money planning, and notes — all in one private home.'

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>ClanKeep — Together. Organised. At home.</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={SITE_URL} />
        <link rel="manifest" href={withBasePath('/manifest.json')} />
        <meta name="theme-color" content="#4D6BFF" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ClanKeep" />
        <meta property="og:title" content="ClanKeep — Run your home like a team." />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ClanKeep — Run your home like a team." />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Head>

      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main>
          <Hero />
          <TrustStrip />
          <FeaturesBento />
          <Medicine />
          <HowItWorks />
          <Screenshots />
          <Pipeline />
          <Pricing />
          <Faq />
          <Privacy />
          <FinalCta />
        </main>
        <Footer />
      </div>

      <KelmaWidget />
      <PublicTracking />
    </>
  )
}
