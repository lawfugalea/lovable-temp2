/**
 * The consent banner and the measurement it gates, kept together.
 *
 * They belong on the same pages by construction: a page that can load the pixel
 * must be a page that can ask permission first, and the pixel is worthless on a
 * page where nobody was asked. Mounting them as a pair is what stops the two
 * drifting apart — the banner previously lived only on the landing and legal
 * pages, so a visitor arriving straight at /register was never asked, and the
 * conversion that matters most went unmeasured.
 *
 * Scoped to the public funnel on purpose. The signed-in app does not mount this:
 * campaigns need the path from advert to signup to subscription, and sending Meta
 * every page an authenticated household visits afterwards would be more data than
 * the purpose needs.
 */
import CookieConsent from '@/components/CookieConsent'
import MetaPixel from '@/components/MetaPixel'

export default function PublicTracking() {
  return (
    <>
      <MetaPixel />
      <CookieConsent />
    </>
  )
}
