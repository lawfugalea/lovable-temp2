import { Check } from 'lucide-react'
import Reveal from '@/components/landing/Reveal'

const points = [
  'Your whole basket totalled per store, cheapest highlighted',
  'Only fresh prices count — anything older than 48 hours is flagged, never silently used',
  'Honest estimates for planning a shop — delivery fees and in-store offers noted as exclusions',
]

const rows = [
  { item: 'Olive oil 750ml', smart: '€6.49', greens: '€6.95', welbees: '€7.10', cheapest: 'smart' },
  { item: 'Pasta rigatoni 500g', smart: '€1.15', greens: '€0.99', welbees: '€1.20', cheapest: 'greens' },
  { item: 'Nappies size 4', smart: '€9.80', greens: '€10.40', welbees: '€10.15', cheapest: 'smart' },
]

const accent = 'text-[#2EE6C8]'

/** Intentionally dark in both themes — a contrast panel for the flagship paid feature. */
export default function PriceCompare() {
  return (
    <section id="prices" className="scroll-mt-24 bg-brand-dark py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal className="min-w-0">
            <p className={`text-sm font-bold uppercase tracking-[0.18em] ${accent}`}>Only in ClanKeep</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
              Know the cheapest supermarket before you grab the keys.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              ClanKeep reads the public online catalogues of Malta’s supermarkets
              — Smart, Greens, Welbee’s and more — and prices your actual
              shopping list at each store. Not last month’s flyer: prices
              refresh automatically every day.
            </p>
            <ul className="mt-8 space-y-4 text-[15px] font-medium text-slate-200">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Check className={`mt-0.5 h-5 w-5 shrink-0 ${accent}`} strokeWidth={3} aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.12} className="min-w-0">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <p className="text-sm font-bold">Weekly shop · 14 items</p>
                <span className={`rounded-full bg-[#2EE6C8]/15 px-3 py-1 text-xs font-bold ${accent}`}>Prices updated today</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-3 font-bold">Item</th>
                      <th className="px-4 py-3 text-right font-bold">Smart</th>
                      <th className="px-4 py-3 text-right font-bold">Greens</th>
                      <th className="px-6 py-3 text-right font-bold">Welbee’s</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {rows.map((row) => (
                      <tr key={row.item} className="border-b border-white/[0.06]">
                        <td className="px-6 py-3 font-medium">{row.item}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${row.cheapest === 'smart' ? `font-bold ${accent}` : ''}`}>{row.smart}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${row.cheapest === 'greens' ? `font-bold ${accent}` : ''}`}>{row.greens}</td>
                        <td className={`px-6 py-3 text-right tabular-nums ${row.cheapest === 'welbees' ? `font-bold ${accent}` : ''}`}>{row.welbees}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-6 py-3 text-slate-400">+ 11 more items…</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-6 py-3" />
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 bg-white/[0.04] font-bold">
                      <td className="px-6 py-4">Basket total</td>
                      <td className={`px-4 py-4 text-right tabular-nums ${accent}`}>€41.22</td>
                      <td className="px-4 py-4 text-right tabular-nums">€43.87</td>
                      <td className="px-6 py-4 text-right tabular-nums">€45.30</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              Illustrative prices. Estimates for planning; catalogue prices can differ from in-store branches.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
