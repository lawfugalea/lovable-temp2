export default function Section({
  title, desc, actions, tone='indigo', children,
}:{
  title:string; desc?:string; actions?:React.ReactNode; tone?:'indigo'|'violet'|'fuchsia'|'rose';
  children:React.ReactNode;
}) {
  const dot = {
    indigo:'bg-indigo-500', violet:'bg-violet-500', fuchsia:'bg-fuchsia-500', rose:'bg-rose-500'
  }[tone];
  return (
    <section className="hf-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
          </div>
          {desc && <p className="text-xs sm:text-sm text-gray-600 mt-1">{desc}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
