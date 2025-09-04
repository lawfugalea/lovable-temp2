// src/components/ui/DashCard.tsx
import { ReactNode } from "react";
export default function DashCard({ children }: { children: ReactNode }) {
  return <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">{children}</div>;
}