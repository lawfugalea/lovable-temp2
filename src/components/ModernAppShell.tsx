import React, { useEffect, useMemo, useState } from "react"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import {
  ChevronsUpDown,
  HelpCircle,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { withBasePath } from "@/lib/base-path"
import { moduleForPath } from "@/lib/modules"
import { useVisibleModules } from "@/hooks/useVisibleModules"
import { Button } from "@/components/ui/Button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/Sheet"
import CommandPalette from "./CommandPalette"
import BottomTabBar from "./BottomTabBar"
import DemoBanner from "./DemoBanner"
import UpgradeButton from "./UpgradeButton"
import BrandLogo from "./BrandLogo"
import HouseholdSwitcher from "./HouseholdSwitcher"
import { signOutAndClearDevice } from "@/lib/sign-out"

const manageItems = [
  { name: "Household", href: "/household", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
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

function ThemePicker() {
  const { theme, setTheme } = useTheme()
  return (
    <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
      <DropdownMenuRadioItem value="light"><Sun /> Light</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark"><Moon /> Dark</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="system"><Monitor /> System</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  )
}

export default function ModernAppShell({ children, title }: ModernAppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true
  const visibleModules = useVisibleModules()

  const activeModule = moduleForPath(router.pathname)

  const activeTitle = useMemo(() => {
    if (title) return title
    if (activeModule) return activeModule.name
    const manageMatch = manageItems.find((item) => item.href === router.pathname)
    if (manageMatch) return manageMatch.name
    return router.pathname === "/admin" ? "Admin" : "Clankeep"
  }, [router.pathname, title, activeModule])

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

  const manageLinks = (
    <div className="space-y-1">
      {manageItems.map((item) => {
        const active = router.pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>{item.name}</span>
          </Link>
        )
      })}
      {isAdmin && (
        <Link
          href="/admin"
          onClick={() => setSidebarOpen(false)}
          aria-current={router.pathname === "/admin" ? "page" : undefined}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            router.pathname === "/admin"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
          <span>Admin</span>
        </Link>
      )}
    </div>
  )

  const accountMenuContent = (
    <DropdownMenuContent side="top" align="start" className="w-64">
      <DropdownMenuLabel>My account</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <HouseholdSwitcher />
      <DropdownMenuItem asChild><Link href="/settings"><Settings /> Settings</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link href="/household"><Users /> Household</Link></DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Theme</DropdownMenuLabel>
      <ThemePicker />
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        onSelect={() => void signOutAndClearDevice()}
      >
        <LogOut /> Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  const userMenu = (
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
        {accountMenuContent}
      </DropdownMenu>
    </div>
  )

  const railLinkClass = (active: boolean, activeClass: string) =>
    cn(
      "grid h-11 w-11 place-items-center rounded-xl transition-colors",
      active ? activeClass : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    )

  // Compact icon rail for tablets (md–lg): modules + manage, no labels.
  const rail = (
    <div className="flex h-full flex-col items-center bg-card py-4">
      <Link href="/dashboard" aria-label="Overview" className="mb-4">
        <BrandLogo compact priority />
      </Link>
      <nav data-tour="nav" className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto" aria-label="Main navigation">
        {visibleModules.map((module) => {
          const active = router.pathname === module.href
          const Icon = module.icon
          return (
            <Link
              key={module.key}
              href={module.href}
              aria-current={active ? "page" : undefined}
              aria-label={module.name}
              title={module.name}
              className={railLinkClass(active, module.activeClass)}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </Link>
          )
        })}
        <div className="my-2 h-px w-8 bg-border" aria-hidden="true" />
        {manageItems.map((item) => {
          const active = router.pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.name}
              title={item.name}
              className={railLinkClass(active, "bg-secondary text-foreground")}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </Link>
          )
        })}
        {isAdmin && (
          <Link
            href="/admin"
            aria-current={router.pathname === "/admin" ? "page" : undefined}
            aria-label="Admin"
            title="Admin"
            className={railLinkClass(router.pathname === "/admin", "bg-secondary text-foreground")}
          >
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </Link>
        )}
      </nav>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Account menu" className="mt-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-9 w-9 border border-primary/15">
              {session?.user?.image && <AvatarImage src={session.user.image} alt="" />}
              <AvatarFallback>{getInitials(session?.user?.name, session?.user?.email)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        {accountMenuContent}
      </DropdownMenu>
    </div>
  )

  const moduleLinks = (
    <div className="space-y-1">
      {visibleModules.map((module) => {
        const active = router.pathname === module.href
        const Icon = module.icon
        return (
          <Link
            key={module.key}
            href={module.href}
            onClick={() => setSidebarOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? cn(module.activeClass, "font-semibold")
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {active && (
              <span aria-hidden="true" className={cn("absolute inset-y-2 left-0 w-[3px] rounded-full", module.barClass)} />
            )}
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                active ? module.tileClass : "bg-muted/60 text-muted-foreground group-hover:bg-card group-hover:text-accent-foreground"
              )}
            >
              <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
            </span>
            <span>{module.name}</span>
          </Link>
        )
      })}
    </div>
  )

  const sidebar = (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-[72px] items-center border-b px-5">
        <Link href="/dashboard" className="group flex items-center" onClick={() => setSidebarOpen(false)}>
          <BrandLogo priority className="transition-transform group-hover:scale-[1.02]" />
        </Link>
      </div>

      <nav data-tour="nav" className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main navigation">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
            Household
          </p>
          {moduleLinks}
        </div>
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
            Manage
          </p>
          {manageLinks}
        </div>
      </nav>

      {userMenu}
    </div>
  )

  const drawer = (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-[72px] items-center border-b px-5">
        <Link href="/dashboard" className="flex items-center" onClick={() => setSidebarOpen(false)}>
          <BrandLogo priority />
        </Link>
      </div>
      <nav data-tour="nav" className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="More navigation">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
            Household
          </p>
          {moduleLinks}
        </div>
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
            Manage
          </p>
          {manageLinks}
        </div>
      </nav>
      {userMenu}
    </div>
  )

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <Head>
        <title>{`${activeTitle} · Clankeep`}</title>
      </Head>
      <aside className="sticky top-0 hidden h-screen border-r bg-card md:block lg:hidden">{rail}</aside>
      <aside className="sticky top-0 hidden h-screen border-r bg-card lg:block">{sidebar}</aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[min(88vw,320px)] p-0">
          <SheetTitle className="sr-only">Clankeep navigation</SheetTitle>
          {drawer}
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <DemoBanner />
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button variant="outline" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Household workspace</p>
              <h1 className="truncate font-display text-lg font-semibold tracking-tight">
                {activeTitle}
                <span
                  aria-hidden="true"
                  className={cn("mt-0.5 block h-0.5 w-8 rounded-full", activeModule ? activeModule.barClass : "bg-transparent")}
                />
              </h1>
            </div>
            <Button
              variant="outline"
              className="hidden min-w-[210px] justify-between bg-card text-muted-foreground shadow-soft-sm sm:flex"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <span className="flex items-center gap-2"><Search className="h-4 w-4" /> Search</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
            </Button>
            <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setCommandPaletteOpen(true)} aria-label="Search Clankeep">
              <Search className="h-4 w-4" />
            </Button>
            {/* The tour's `upgrade` anchor lives on UpgradeButton itself, which
                only renders for free households — matching that step's `when`. */}
            <UpgradeButton />
            <Button asChild variant="outline" size="icon" data-tour="help" className="hidden sm:inline-flex" aria-label="Help">
              <Link href="/help" title="Help"><HelpCircle className="h-4 w-4" /></Link>
            </Button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-72px)] px-4 py-5 pb-28 sm:px-6 sm:py-7 md:pb-8 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1520px] animate-fade-in">{children}</div>
        </main>
      </div>

      <BottomTabBar onOpenMore={() => setSidebarOpen(true)} />
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  )
}
