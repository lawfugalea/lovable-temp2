export default function Chip({ tone='indigo', children }:{ tone?: 'indigo'|'red'|'emerald'|'violet'; children: React.ReactNode }) {
  const map = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${map}`}>{children}</span>;
}
