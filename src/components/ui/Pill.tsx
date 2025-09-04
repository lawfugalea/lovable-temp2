import { ReactNode } from "react";
export default function Pill({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full border text-sm min-h-[36px]",
        active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50 border-gray-300 text-gray-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}