import { useCallback, useEffect, useState } from "react"
import { Check, Home, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { withBasePath } from "@/lib/base-path"
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu"

export interface HouseholdSummary {
  id: string
  name: string
  country: string
  role: "OWNER" | "MEMBER"
  memberCount: number
}

/**
 * Loads the households this user belongs to. Fetches once per mount rather than
 * polling — membership only changes through an explicit action (accepting an
 * invite, leaving), and both of those already reload the page.
 */
export function useHouseholds() {
  const [households, setHouseholds] = useState<HouseholdSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch("/api/household/list", { credentials: "include" })
        if (!response.ok) return
        const data = await response.json()
        if (cancelled) return
        setHouseholds(Array.isArray(data.households) ? data.households : [])
        setActiveId(typeof data.activeHouseholdId === "string" ? data.activeHouseholdId : null)
      } catch {
        // A switcher that fails to load simply does not render; the rest of the
        // account menu must stay usable.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { households, activeId, loading }
}

/**
 * Household section of the account menu. Renders menu items directly, so it has
 * to be used inside a DropdownMenuContent.
 *
 * Switching does a full page load rather than a client transition: almost every
 * page holds household-scoped state fetched at mount, and a soft navigation
 * would leave the previous household's lists, balances and doses on screen
 * under the new household's name.
 */
export default function HouseholdSwitcher() {
  const { households, activeId, loading } = useHouseholds()
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const switchTo = useCallback(async (householdId: string) => {
    if (householdId === activeId) return
    setSwitchingId(householdId)
    try {
      const response = await fetch("/api/household/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ householdId }),
      })
      if (!response.ok) throw new Error("Could not switch household")
      window.location.href = withBasePath("/dashboard")
    } catch {
      setSwitchingId(null)
    }
  }, [activeId])

  // One household is the common case and needs no switcher — showing a list of
  // one would be noise in every user's menu.
  if (loading || households.length < 2) return null

  return (
    <>
      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
        Households
      </DropdownMenuLabel>
      {households.map((household) => {
        const active = household.id === activeId
        return (
          <DropdownMenuItem
            key={household.id}
            disabled={switchingId !== null}
            onSelect={(event) => {
              event.preventDefault()
              void switchTo(household.id)
            }}
          >
            {switchingId === household.id
              ? <Loader2 className="animate-spin" aria-hidden="true" />
              : <Home aria-hidden="true" />}
            <span className="min-w-0 flex-1 truncate">{household.name}</span>
            {active && <Check className="h-4 w-4 text-primary" aria-label="Current household" />}
          </DropdownMenuItem>
        )
      })}
      <DropdownMenuItem asChild>
        <Link href="/household"><Plus aria-hidden="true" /> Manage households</Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  )
}
