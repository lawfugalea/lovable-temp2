export default function PageHeader({
  title, subtitle, householdId, status,
}:{
  title:string; subtitle?:string; householdId?:string|null; status?:React.ReactNode;
}) {
  return (
    <section className="mx-3 sm:mx-5 mt-4 rounded-2xl p-4 sm:p-5 shadow-soft"
      style={{ background:'linear-gradient(90deg,var(--hf-grad-from),var(--hf-grad-via),var(--hf-grad-to))' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-gray-700 mt-1">{subtitle}</p>}
          {householdId && (
            <div className="mt-1 text-xs text-gray-700">
              Household: <span className="font-mono">{householdId}</span>
            </div>
          )}
        </div>
        {status && <div className="text-xs sm:text-sm">{status}</div>}
      </div>
    </section>
  );
}
