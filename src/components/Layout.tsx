import React from "react"
import Link from "next/link"
import { useRouter } from "next/router"

type NavItem = { href: string; label: string; icon: string }

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "🏠" },
  { href: "/shopping", label: "Shopping", icon: "🧺" },
  { href: "/finances", label: "Finances", icon: "💰" },
  { href: "/notes", label: "Notes", icon: "📝" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const isActive = (href: string) =>
    router.pathname === href || 
    (href === "/dashboard" && (router.pathname === "/" || router.pathname.startsWith("/dashboard")))

  return (
    <div className="min-h-screen bg-cozy-bg text-cozy-text">
      {/* Warm header with cozy gradient */}
      <header className="sticky top-0 z-40 md:pl-60">
        <div className="bg-cozy-header border-b border-cozy-gray-200/60 backdrop-blur-md">
          <div className="h-16 flex items-center justify-between px-4 sm:px-6">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-cozy bg-cozy-surface shadow-cozy-sm grid place-items-center text-cozy-primary text-lg font-bold border border-cozy-primary-soft transition-transform group-hover:animate-cozy-wiggle">
                🏠
              </div>
              <div>
                <span className="font-bold text-lg text-cozy-text">Houseflow</span>
                <div className="text-xs text-cozy-text-muted font-medium">Your cozy home hub</div>
              </div>
            </Link>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-xs text-cozy-text-muted bg-cozy-surface/80 px-3 py-1.5 rounded-cozy border border-cozy-gray-200 animate-cozy-pulse-gentle">
                ✨ Warm & welcoming
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Cozy desktop sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-60">
        <div className="h-full bg-cozy-surface/90 backdrop-blur-md border-r border-cozy-gray-200">
          <div className="pt-20 px-4">
            <nav className="space-y-2">
              {NAV.map((n, index) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={[
                    "flex items-center gap-4 px-4 py-3 rounded-cozy transition-all duration-200 group animate-cozy-bounce-in",
                    isActive(n.href)
                      ? "bg-cozy-primary text-cozy-surface shadow-cozy-glow"
                      : "hover:bg-cozy-cream text-cozy-text hover:shadow-cozy-sm hover:animate-cozy-wiggle",
                  ].join(" ")}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="text-xl cozy-emoji group-hover:animate-cozy-wiggle">{n.icon}</span>
                  <span className="text-sm font-medium">{n.label}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-8 p-4 bg-cozy-warm rounded-cozy-lg border border-cozy-gray-200 animate-cozy-float">
              <div className="text-xs text-cozy-text-muted text-center">
                <div className="text-2xl mb-2 animate-cozy-pulse-gentle">🫖</div>
                <div className="font-medium">Cozy vibes</div>
                <div>Home is where the heart is</div>
                <div className="flex justify-center gap-1 mt-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-cozy-primary-soft rounded-full animate-cozy-pulse"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Warm page content */}
      <main className="pb-24 md:pb-0 md:pl-60">
        {/* Cozy welcome strip */}
        <div className="bg-cozy-surface/80 backdrop-blur-sm border-b border-cozy-gray-200/60">
          <div className="mx-4 sm:mx-6 py-4 text-sm text-cozy-text-muted">
            <span className="hidden sm:inline flex items-center gap-2">
              <span className="animate-cozy-pulse-gentle">☀️</span>
              Welcome home — everything organized with love
              <span className="animate-cozy-pulse-gentle animation-delay-500">💝</span>
            </span>
            <span className="sm:hidden flex items-center gap-2">
              <span className="animate-cozy-wiggle">🏠</span>
              Your cozy hub
            </span>
          </div>
        </div>
        <div className="mx-4 sm:mx-6 my-6">{children}</div>
      </main>

      {/* Cozy mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="mx-4 mb-3 bg-cozy-surface/95 backdrop-blur-md border border-cozy-gray-200 rounded-cozy-lg shadow-cozy-lg p-2 flex justify-between animate-cozy-bounce-in">
          {NAV.map((n, index) => {
            const active = isActive(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  "flex-1 mx-1 flex flex-col items-center justify-center gap-1 rounded-cozy py-3 text-xs font-medium transition-all duration-200 group",
                  active 
                    ? "bg-cozy-primary text-cozy-surface shadow-cozy-sm animate-cozy-glow" 
                    : "text-cozy-text-muted hover:bg-cozy-cream hover:text-cozy-text hover:animate-cozy-wiggle",
                ].join(" ")}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="text-lg leading-none cozy-emoji group-hover:animate-cozy-wiggle">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}