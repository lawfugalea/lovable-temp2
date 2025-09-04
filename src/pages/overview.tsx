// src/pages/overview.tsx
import AppShell from "@/components/AppShell";
import DashCard from "@/components/ui/DashCard";
import Link from "next/link";

export default function OverviewPage() {
  return (
    <AppShell title="Overview">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Shopping widget */}
        <DashCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-blue-100 grid place-items-center">🧺</div>
                <div>
                  <div className="font-semibold">Shopping List</div>
                  <div className="text-xs text-gray-500">4 items</div>
                </div>
              </div>
              <Link href="/shopping" className="rounded-xl bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black">
                Add
              </Link>
            </div>

            <div className="mt-3">
              <button className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-left hover:bg-gray-50">+ Quick Add</button>
            </div>
          </div>
        </DashCard>

        {/* Finances widget */}
        <DashCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-rose-100 grid place-items-center">💰</div>
                <div>
                  <div className="font-semibold">Finances</div>
                  <div className="text-xs text-gray-500">€1,200 • €950 • €3.00</div>
                </div>
              </div>
              <Link href="/finances" className="rounded-xl bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black">
                Add
              </Link>
            </div>

            <div className="mt-3">
              <button className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-left hover:bg-gray-50">Quick Add</button>
            </div>
          </div>
        </DashCard>

        {/* Timeline */}
        <DashCard>
          <div className="p-4">
            <div className="font-semibold mb-2">Timeline</div>
            <ul className="divide-y">
              {[
                { icon: "🍼", title: "Added Milk to the shopping list", meta: "Apr 22" },
                { icon: "🏦", title: "Paid Rent", meta: "Apr 1" },
                { icon: "💸", title: "Transferred to savings", meta: "Mar 25" },
              ].map((row, i) => (
                <li key={i} className="py-3">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-xl bg-gray-50 grid place-items-center mr-3">{row.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-800 truncate">{row.title}</div>
                      <div className="text-xs text-gray-500">{row.meta}</div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </DashCard>
      </div>
    </AppShell>
  );
}
