// src/components/finance/ContribBlock.tsx
import { Card } from "../Card";

type AccountLite = { id: string; name: string; target: number };
type EarnerLite = { id: string; name: string };
type Earner = { id: string; name: string; salary: number; keep: number };

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

export function ContribTableDesktop({
  accounts, earners, split, autoSavingsTarget, savingsPct,
}:{
  accounts: AccountLite[]; earners: Earner[];
  split: (target:number, e:Earner)=>number;
  autoSavingsTarget: number; savingsPct: number;
}) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="md:sticky md:top-0 bg-white">
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Account</th>
            {earners.map(e => <th key={e.id} className="py-2 pr-4">{e.name}</th>)}
            <th className="py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {[...accounts, { id: "savings", name: `Savings (${savingsPct}%)`, target: autoSavingsTarget }].map(a => {
            const per = earners.map(e => split(a.target, e));
            const total = per.reduce((s, n) => s + n, 0);
            return (
              <tr key={a.id} className="border-b hover:bg-gray-50/60">
                <td className="py-2 pr-4 font-medium">{a.name}</td>
                {per.map((n, i) => <td key={i} className="py-2 pr-4">{money(n)}</td>)}
                <td className="py-2">{money(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ContribCardsMobile({
  accounts, earners, split, autoSavingsTarget, savingsPct,
}:{
  accounts: AccountLite[]; earners: Earner[];
  split: (target:number, e:Earner)=>number;
  autoSavingsTarget: number; savingsPct: number;
}) {
  return (
    <div className="md:hidden grid gap-3">
      {[...accounts, { id: "savings", name: `Savings (${savingsPct}%)`, target: autoSavingsTarget }].map(a => {
        const per = earners.map(e => ({ name: e.name, amount: split(a.target, e) }));
        const total = per.reduce((s, n) => s + n.amount, 0);
        return (
          <Card key={a.id} className="p-3">
            <div className="font-medium mb-2">{a.name}</div>
            <div className="space-y-1 text-sm">
              {per.map(p => (
                <div key={p.name} className="flex justify-between">
                  <span>{p.name}</span><span className="font-medium">{money(p.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t mt-2 font-semibold">
                <span>Total</span><span>{money(total)}</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
