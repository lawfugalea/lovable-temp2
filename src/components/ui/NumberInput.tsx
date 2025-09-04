import React from "react";
export default function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      inputMode="decimal"
      className={[
        "border border-gray-300 rounded-xl px-3 py-2 w-full min-w-0 placeholder-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        props.className || ""
      ].join(" ")}
    />
  );
}
