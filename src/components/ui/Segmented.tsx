type Opt = { value: string; label: string };
export default function Segmented(
  { value, onChange, options, className="" }:{
    value: string; onChange: (v:string)=>void; options: Opt[]; className?: string;
  }
){
  return (
    <div className={`inline-flex rounded-xl border border-gray-300 overflow-hidden ${className}`}>
      {options.map((o,i)=>(
        <button
          key={o.value}
          onClick={()=>onChange(o.value)}
          className={[
            "px-3 py-1.5 text-sm whitespace-nowrap",
            value===o.value ? "bg-indigo-600 text-white" : "bg-white hover:bg-gray-50",
            i!==options.length-1 ? "border-r border-gray-300" : ""
          ].join(" ")}
          aria-pressed={value===o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
