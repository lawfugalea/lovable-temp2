import type { HTMLAttributes, ReactNode } from 'react';
export default function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`hf-card ${className}`} {...rest}>{children}</div>;
}
