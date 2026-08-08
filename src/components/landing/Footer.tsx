import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'

const anchors = [
  { href: '#features', label: 'Features' },
  { href: '#medicine', label: 'Medicine' },
  { href: '#tour', label: 'Screenshots' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div>
          <Link href="/landing" className="inline-flex items-center">
            <BrandLogo />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The private HQ for everything your household shares. Together.
            Organised. At home.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-5 text-sm font-medium text-muted-foreground sm:flex-row sm:items-center">
          {anchors.map((anchor) => (
            <a key={anchor.href} href={anchor.href} className="transition-colors hover:text-foreground">
              {anchor.label}
            </a>
          ))}
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
      <div className="border-t border-border px-4 py-6 text-center text-xs font-medium text-muted-foreground">
        &copy; {new Date().getFullYear()} ClanKeep. All rights reserved.
      </div>
    </footer>
  )
}
