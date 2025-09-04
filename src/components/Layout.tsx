// src/components/Layout.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string; icon: string };
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "🏠" },
  { href: "/shopping",  label: "Shopping", icon: "🧺" },
  { href: "/finances",  label: "Finances", icon: "💰" },
  { href: "/settings",  label: "Settings", icon: "⚙️" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();

  const isActive = (href: string) =>
    pathname === href || (href === "/dashboard" && (pathname === "/" || pathname.startsWith("/dashboard")));

  return (
    <div className="min-h-screen bg-[var(--hf-bg)] text-hf-ink">
      {/* Top gradient header */}
      <header className="sticky top-0 z-40 md:pl-60">
        <div
          className="border-b"
          style={{
            background:
              "linear-gradient(90deg,var(--hf-grad-from),var(--hf-grad-via),var(--hf-grad-to))",
            borderColor: "rgba(255,255,255,.6)",
          }}
        >
          <div className="h-14 flex items-center justify-between px-3 sm:px-5">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-white grid place-items-center shadow-sm">H</div>
              <span className="font-semibold">Houseflow</span>
            </Link>
            <div className="text-xs text-gray-700 hidden sm:block">
              Mobile-first • family-friendly
            </div>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-60">
        <div className="h-full bg-white/70 backdrop-blur border-r border-gray-200">
          <div className="pt-16 px-3">
            <nav className="space-y-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={[
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition",
                    isActive(n.href)
                      ? "bg-gray-900 text-white shadow-sm"
                      : "hover:bg-gray-100 text-gray-800",
                  ].join(" ")}
                >
                  <span className="text-lg">{n.icon}</span>
                  <span className="text-sm">{n.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* Page content */}
      <main className="pb-20 md:pb-0 md:pl-60">
        {/* optional glass strip under header */}
        <div className="backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-white/60">
          <div className="mx-3 sm:mx-5 py-3 text-sm text-gray-600">
            <span className="hidden sm:inline">Welcome back — everything in one place.</span>
          </div>
        </div>
        <div className="mx-3 sm:mx-5 my-4">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-[max(8px,env(safe-area-inset-bottom))]">
        <div className="mx-3 bg-white border rounded-2xl shadow-lg p-1.5 flex justify-between">
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  "flex-1 mx-1 flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px]",
                  active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                <span className="text-base leading-none">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
