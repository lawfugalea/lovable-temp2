// src/components/AppShell.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import Image from "next/image";

const nav = [
  { href: "/overview", label: "Overview", icon: "🏠" },
  { href: "/finances", label: "Finances", icon: "💰" },
  { href: "/shopping", label: "Shopping", icon: "🧺" },
  { href: "/notes", label: "Notes", icon: "📝" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/household", label: "Household", icon: "👪" },
];

export default function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const { pathname } = useRouter();

  return (
    <div className="min-h-screen bg-[#faf9fb]">
      {/* Top gradient header (mobile & desktop) */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-rose-100 via-amber-100 to-emerald-100 border-b border-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 md:pl-60">
        <div className="h-14 flex items-center justify-between px-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Link href="/overview" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-white shadow-sm grid place-items-center text-[18px]">H</div>
              <span className="font-semibold text-gray-900">Houseflow</span>
            </Link>
            {title && <span className="ml-3 text-sm text-gray-600">{title}</span>}
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl border bg-white/80 px-3 py-1.5 text-sm hover:bg-white">Search</button>
            <Image src="/avatar.png" alt="you" width={28} height={28} className="rounded-full border border-white/70" />
          </div>
        </div>
      </div>

      {/* Sidebar (desktop) */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-60 bg-white/70 backdrop-blur border-r border-gray-200">
        <div className="pt-16 px-3">
          <nav className="space-y-1">
            {nav.map((n) => {
              const active = pathname.startsWith(n.href) || (n.href === "/overview" && pathname === "/");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={[
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition",
                    active ? "bg-gray-900 text-white shadow-sm" : "hover:bg-gray-100 text-gray-800",
                  ].join(" ")}
                >
                  <span className="text-lg">{n.icon}</span>
                  <span className="text-sm">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="absolute left-0 right-0 bottom-3 px-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border">
              <div className="h-6 w-6 rounded bg-white grid place-items-center text-xs">🎧</div>
              <div className="text-xs text-gray-700 truncate">Grovey</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Page content */}
      <main className="md:pl-60">
        <div className="mx-3 sm:mx-5 my-4">{children}</div>
      </main>
    </div>
  );
}
