import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { signOut, useSession } from "next-auth/react"
import {
  ChevronsUpDown,
  CircleDollarSign,
  FileText,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { withBasePath } from "@/lib/base-path"
import { Button } from "@/components/ui/Button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/Sheet"
import CommandPalette from "./CommandPalette"
import BrandLogo from "./BrandLogo"

const navigationGroups = [
  {
    label: "Home",
    items: [{ name: "Overview", href: "/dashboard", icon: Home }],
  },
  {
    label: "Household tools",
    items: [
      { name: "Shopping", href: "/shopping", icon: ShoppingBasket },
      { name: "Finances", href: "/finances", icon: CircleDollarSign },
      { name: "Medicine", href: "/medicine", icon: HeartPulse },
      { name: "Notes", href: "/notes", icon: FileText },
    ],
  },
  {
    label: "Manage",
    items: [
      { name: "Household", href: "/household", icon: Users },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

interface ModernAppShellProps {
  children: React.ReactNode
  title?: string
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Clankeep"
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CK"
}

export default function ModernAppShell({ children, title }: ModernAppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true

  const activeTitle = useMemo(() => {
    if (title) return title
    for (const group of navigationGroups) {
      const match = group.items.find((item) => item.href === router.pathname)
      if (match) return match.name
    }
    return router.pathname === "/admin" ? "Admin" : "Clankeep"
  }, [router.pathname, title])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const navigation = (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-[72px] items-center border-b px-5">
        <Link href="/dashboard" className="group flex items-center" onClick={() => setSidebarOpen(false)}>
          <BrandLogo priority className="transition-transform group-hover:scale-[1.02]" />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main navigation">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = router.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px]", !active && "text-muted-foreground group-hover:text-accent-foreground")} aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              {group.label === "Manage" && isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setSidebarOpen(false)}
                  aria-current={router.pathname === "/admin" ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    router.pathname === "/admin"
                      ? "bg-brand-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span>Admin</span>
                </Link>
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2 text-left">
              <Avatar className="h-9 w-9 border border-primary/15">
                {session?.user?.image && <AvatarImage src={session.user.image} alt="" />}
                <AvatarFallback>{getInitials(session?.user?.name, session?.user?.email)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{session?.user?.name || "Clankeep member"}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{session?.user?.email || "Account"}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/settings"><Settings /> Settings</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/household"><Users /> Household</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onSelect={() => void signOut({ callbackUrl: withBasePath("/login") })}
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r bg-card lg:block">{navigation}</aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[min(88vw,320px)] p-0">
          <SheetTitle className="sr-only">Clankeep navigation</SheetTitle>
          {navigation}
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Household workspace</p>
              <h1 className="truncate text-lg font-semibold tracking-tight">{activeTitle}</h1>
            </div>
            <Button
              variant="outline"
              className="hidden min-w-[210px] justify-between bg-card text-muted-foreground shadow-sm sm:flex"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <span className="flex items-center gap-2"><Search className="h-4 w-4" /> Search</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
            </Button>
            <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setCommandPaletteOpen(true)} aria-label="Search Clankeep">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-72px)] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1520px] animate-cozy-fade-in">{children}</div>
        </main>
      </div>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  )
}
