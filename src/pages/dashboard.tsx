import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  HeartPulse,
  Home,
  ListChecks,
  ShoppingBasket,
  Sparkles,
} from "lucide-react"
import ModernAppShell from "@/components/ModernAppShell"
import ChoreTodayList, { todayItemKey, type TodayChoreItem } from "@/components/chores/ChoreTodayList"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/Skeleton"
import { cn } from "@/lib/utils"
import { getMedicineSchedule } from "@/lib/medicine"

interface ShoppingList {
  id: string
  name: string
  itemCount: number
}

interface Medicine {
  id: string
  childId: string
  name: string
  dosage: string
  frequency: string
  startDate: string
  endDate?: string | null
  isActive: boolean
  isTemplate: boolean
  nextDoseOverride?: string
  overrideReason?: string | null
  minGapHours?: number | null
  maxDosesPer24h?: number | null
  isPrn?: boolean
  scheduleVerifiedAt?: string | null
  child: { id: string; name: string }
}

interface MedicineDose {
  id: string
  childId: string
  medicineId: string
  takenAt: string
  dosage: string
  notes?: string
  medicine: { name: string }
  child: { name: string }
}

type SummaryCardProps = {
  eyebrow: string
  title: string
  description: string
  href: string
  action: string
  icon: React.ComponentType<{ className?: string }>
  tone: "shopping" | "finances" | "medicine" | "chores"
  delayClass?: string
}

const summaryTones = {
  shopping: {
    tile: "bg-module-shopping/10 text-module-shopping ring-module-shopping/15",
    link: "text-module-shopping hover:bg-module-shopping/10 hover:text-module-shopping",
    hover: "hover:border-module-shopping/30",
  },
  finances: {
    tile: "bg-module-finances/10 text-module-finances ring-module-finances/15",
    link: "text-module-finances hover:bg-module-finances/10 hover:text-module-finances",
    hover: "hover:border-module-finances/30",
  },
  medicine: {
    tile: "bg-module-medicine/10 text-module-medicine ring-module-medicine/15",
    link: "text-module-medicine hover:bg-module-medicine/10 hover:text-module-medicine",
    hover: "hover:border-module-medicine/30",
  },
  chores: {
    tile: "bg-module-chores/10 text-module-chores ring-module-chores/15",
    link: "text-module-chores hover:bg-module-chores/10 hover:text-module-chores",
    hover: "hover:border-module-chores/30",
  },
}

function SummaryCard({ eyebrow, title, description, href, action, icon: Icon, tone, delayClass }: SummaryCardProps) {
  const tones = summaryTones[tone]
  return (
    <Card className={cn("group animate-rise overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-soft", tones.hover, delayClass)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("grid h-11 w-11 place-items-center rounded-xl ring-1", tones.tile)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <Badge variant="outline" className="font-medium text-muted-foreground">{eyebrow}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-muted-foreground">{description}</p>
        <Button asChild variant="ghost" className={cn("mt-5 -ml-3", tones.link)}>
          <Link href={href}>{action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="space-y-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-5 w-96 max-w-full" /></div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-60 rounded-lg" />)}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [financeSummary, setFinanceSummary] = useState<{ accountCount: number; totals: Array<{ currency: string; amount: string }> }>({ accountCount: 0, totals: [] })
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [recentDoses, setRecentDoses] = useState<MedicineDose[]>([])
  const [loading, setLoading] = useState(true)
  const [showJoinSuccess, setShowJoinSuccess] = useState(false)
  const [todayChores, setTodayChores] = useState<TodayChoreItem[]>([])
  const [choreBusyKey, setChoreBusyKey] = useState<string | null>(null)

  useEffect(() => {
    if (router.query.joined === "1") {
      setShowJoinSuccess(true)
      void router.replace("/dashboard", undefined, { shallow: true })
      const timeout = window.setTimeout(() => setShowJoinSuccess(false), 5000)
      return () => window.clearTimeout(timeout)
    }
  }, [router.query.joined, router])

  const loadShoppingData = useCallback(async (_householdId: string) => {
    try {
      const response = await fetch("/api/shopping/lists")
      if (!response.ok) return
      const data = await response.json()
      const lists = Array.isArray(data.lists) ? data.lists : []
      setShoppingLists(lists)

      const itemCounts = await Promise.all(lists.map(async (list: ShoppingList) => {
        const itemsResponse = await fetch(`/api/shopping/items?listId=${encodeURIComponent(list.id)}`)
        if (!itemsResponse.ok) return 0
        const itemsData = await itemsResponse.json()
        return Array.isArray(itemsData.items) ? itemsData.items.length : 0
      }))
      setTotalItems(itemCounts.reduce((total: number, count: number) => total + count, 0))
    } catch (error) {
      console.error("Failed to load shopping data:", error)
    }
  }, [])

  const loadMedicineData = useCallback(async (householdId: string) => {
    try {
      const medicinesResponse = await fetch(`/api/medicine/medicines?householdId=${encodeURIComponent(householdId)}`)
      if (medicinesResponse.ok) {
        const medicinesData = await medicinesResponse.json()
        setMedicines(Array.isArray(medicinesData) ? medicinesData : [])
      }

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const dosesResponse = await fetch(`/api/medicine/doses?householdId=${encodeURIComponent(householdId)}&startDate=${sevenDaysAgo.toISOString().split("T")[0]}`)
      if (dosesResponse.ok) {
        const dosesData = await dosesResponse.json()
        setRecentDoses(Array.isArray(dosesData) ? dosesData : [])
      }
    } catch (error) {
      console.error("Failed to load medicine data:", error)
    }
  }, [])

  const loadChoresData = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString("en-CA")
      const response = await fetch(`/api/chores/today?date=${today}`)
      if (!response.ok) return
      const data = await response.json()
      setTodayChores(Array.isArray(data.items) ? data.items : [])
    } catch (error) {
      console.error("Failed to load chores:", error)
    }
  }, [])

  const resolveChore = useCallback(async (item: TodayChoreItem, resolveStatus: "DONE" | "SKIPPED") => {
    setChoreBusyKey(todayItemKey(item))
    try {
      await fetch("/api/chores/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId: item.chore.id, dueDate: item.dueDate, status: resolveStatus }),
      })
      await loadChoresData()
    } finally {
      setChoreBusyKey(null)
    }
  }, [loadChoresData])

  const undoChore = useCallback(async (item: TodayChoreItem) => {
    setChoreBusyKey(todayItemKey(item))
    try {
      await fetch("/api/chores/complete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId: item.chore.id, dueDate: item.dueDate }),
      })
      await loadChoresData()
    } finally {
      setChoreBusyKey(null)
    }
  }, [loadChoresData])

  const loadFinanceData = useCallback(async (householdId: string) => {
    try {
      const response = await fetch(`/api/finance/overview?householdId=${encodeURIComponent(householdId)}`)
      if (!response.ok) return
      const data = await response.json()
      setFinanceSummary({
        accountCount: Array.isArray(data.accounts) ? data.accounts.length : 0,
        totals: Array.isArray(data.totals) ? data.totals : [],
      })
    } catch (error) {
      console.error("Failed to load finance summary:", error)
    }
  }, [])

  const loadHouseholdData = useCallback(async () => {
    try {
      const response = await fetch("/api/household/active")
      const data = await response.json()
      if (data.householdId) {
        await Promise.all([
          loadShoppingData(data.householdId),
          loadMedicineData(data.householdId),
          loadFinanceData(data.householdId),
          loadChoresData(),
        ])
      }
    } catch (error) {
      console.error("Failed to load household data:", error)
    } finally {
      setLoading(false)
    }
  }, [loadChoresData, loadFinanceData, loadMedicineData, loadShoppingData])

  useEffect(() => {
    if (status === "authenticated") {
      void loadHouseholdData()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [status, loadHouseholdData])

  const activeMedicines = medicines.filter((medicine) => medicine.isActive && !medicine.isTemplate)
  const dueMedicines = activeMedicines.filter((medicine) => (
    Boolean(medicine.scheduleVerifiedAt) && getMedicineSchedule(medicine, recentDoses, new Date()).isDue
  ))
  const firstName = session?.user?.name?.trim().split(/\s+/)[0]
  const pendingChores = todayChores.filter((item) => item.status === "PENDING")
  const financeDetail = financeSummary.accountCount > 0
    ? `${financeSummary.accountCount} connected account${financeSummary.accountCount === 1 ? "" : "s"}${financeSummary.totals[0] ? ` · ${financeSummary.totals[0].amount} ${financeSummary.totals[0].currency}` : ""}`
    : "No connected accounts are visible to you yet"

  if (status === "loading" || loading) {
    return <ModernAppShell title="Overview"><DashboardSkeleton /></ModernAppShell>
  }

  return (
    <ModernAppShell title="Overview">
      <div className="space-y-6 sm:space-y-8">
        <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-7 shadow-soft-sm sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-accent/80 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Your household at a glance
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Welcome home{firstName ? `, ${firstName}` : ""}.</h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Keep today&apos;s lists, money, medicines and shared plans moving from one calm workspace.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full bg-background/75 sm:w-auto">
              <Link href="/household"><Home className="h-4 w-4" /> Manage household</Link>
            </Button>
          </div>
        </section>

        {showJoinSuccess && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Household joined</AlertTitle>
            <AlertDescription>You now have access to the household workspace and its shared information.</AlertDescription>
          </Alert>
        )}

        {dueMedicines.length > 0 && (
          <Alert variant="warning">
            <Clock3 className="h-4 w-4" />
            <AlertTitle>{dueMedicines.length} medicine reminder{dueMedicines.length === 1 ? "" : "s"}</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{dueMedicines.map((medicine) => `${medicine.name} for ${medicine.child.name}`).join(", ")}</span>
              <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-300 bg-white/70 text-amber-950 hover:bg-white">
                <Link href="/medicine">Review schedule <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section aria-labelledby="household-summary-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="household-summary-heading" className="font-display text-xl font-semibold tracking-tight">Household summary</h2>
              <p className="mt-1 text-sm text-muted-foreground">The things that may need your attention today.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              eyebrow={`${shoppingLists.length} list${shoppingLists.length === 1 ? "" : "s"}`}
              title={`${totalItems} shopping item${totalItems === 1 ? "" : "s"}`}
              description={shoppingLists.length ? "Shared lists are ready for the next shop." : "Create a shared list to start planning the next shop."}
              href="/shopping"
              action="Open shopping"
              icon={ShoppingBasket}
              tone="shopping"
            />
            <SummaryCard
              eyebrow={`${financeSummary.accountCount} account${financeSummary.accountCount === 1 ? "" : "s"}`}
              title="Finances visible to you"
              description={financeDetail}
              href="/finances"
              action="View finances"
              icon={CircleDollarSign}
              tone="finances"
              delayClass="animation-delay-100"
            />
            <SummaryCard
              eyebrow={dueMedicines.length ? `${dueMedicines.length} due` : "On schedule"}
              title={`${activeMedicines.length} active medicine${activeMedicines.length === 1 ? "" : "s"}`}
              description={dueMedicines.length ? "Review the verified regimens currently due." : "No verified scheduled medicine is currently due."}
              href="/medicine"
              action="Open medicine"
              icon={HeartPulse}
              tone="medicine"
              delayClass="animation-delay-200"
            />
            <SummaryCard
              eyebrow={pendingChores.length ? `${pendingChores.length} to do` : "All done"}
              title={pendingChores.length ? `${pendingChores.length} chore${pendingChores.length === 1 ? "" : "s"} today` : "Chores done"}
              description={pendingChores.length ? "Tick off today's household jobs together." : "Nothing due right now — set up recurring chores for the whole clan."}
              href="/chores"
              action="Open chores"
              icon={ListChecks}
              tone="chores"
              delayClass="animation-delay-300"
            />
          </div>
        </section>

        {todayChores.length > 0 && (
          <section aria-labelledby="today-chores-heading">
            <div className="mb-3 flex items-end justify-between gap-4">
              <h2 id="today-chores-heading" className="font-display text-xl font-semibold tracking-tight">Today&apos;s chores</h2>
              <Button asChild variant="ghost" size="sm" className="text-module-chores hover:bg-module-chores/10 hover:text-module-chores">
                <Link href="/chores">Open chores <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <ChoreTodayList
              items={todayChores}
              busyKey={choreBusyKey}
              compact
              onResolve={(item, resolveStatus) => void resolveChore(item, resolveStatus)}
              onUndo={(item) => void undoChore(item)}
            />
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Recent activity</CardTitle>
              <CardDescription>Recent medicine records and shopping lists from this household.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {recentDoses.slice(0, 3).map((dose) => (
                  <div key={dose.id} className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-module-medicine/10 text-module-medicine"><HeartPulse className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{dose.medicine.name} recorded for {dose.child.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(dose.takenAt).toLocaleDateString()} · {new Date(dose.takenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {dose.dosage}
                      </p>
                    </div>
                  </div>
                ))}
                {shoppingLists.slice(0, Math.max(1, 4 - recentDoses.slice(0, 3).length)).map((list) => (
                  <div key={list.id} className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-module-shopping/10 text-module-shopping"><ShoppingBasket className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{list.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{list.itemCount} item{list.itemCount === 1 ? "" : "s"} in this shopping list</p>
                    </div>
                  </div>
                ))}
                {recentDoses.length === 0 && shoppingLists.length === 0 && (
                  <div className="px-5 py-10 text-center">
                    <Activity className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-medium">No recent household activity</p>
                    <p className="mt-1 text-sm text-muted-foreground">New list and medicine activity will appear here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-foreground text-background">
            <CardHeader>
              <CardTitle>Move something forward</CardTitle>
              <CardDescription className="text-background/65">Jump straight into a shared household tool.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/shopping", label: "Update a shopping list", icon: ShoppingBasket },
                { href: "/finances", label: "Review your finance view", icon: CircleDollarSign },
                { href: "/medicine", label: "Record medicine", icon: HeartPulse },
              ].map((item) => (
                <Button key={item.href} asChild variant="ghost" className="w-full justify-between text-background hover:bg-background/10 hover:text-background">
                  <Link href={item.href}><span className="flex items-center gap-2"><item.icon className="h-4 w-4" /> {item.label}</span><ArrowRight className="h-4 w-4" /></Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </ModernAppShell>
  )
}
