import React from 'react'
import type { SavingsAccount } from '@/lib/finance/savings'

interface PlanAccountSelectProps {
  accounts: SavingsAccount[]
  value: string
  onChange: (value: string) => void
  /** Omit to render the bare control, for use inside a row that already has a label. */
  label?: string
  hint?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * Picks which savings account a goal builds up in. Mirrors the MemberSelect pattern in
 * PlannerPanel: a native select, so phone pickers behave.
 */
export default function PlanAccountSelect({
  accounts,
  value,
  onChange,
  label,
  hint,
  disabled,
  className,
  ...rest
}: PlanAccountSelectProps) {
  const assignable = accounts.filter(account => account.canEdit)
  if (assignable.length === 0) return null

  const control = (
    <select
      className={`h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:h-10 sm:text-sm ${className ?? ''}`}
      value={value}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      aria-label={rest['aria-label'] ?? label ?? 'Which account you’re saving into'}
    >
      <option value="">No account yet</option>
      {assignable.map(account => (
        <option key={account.id} value={account.id}>
          {account.visibility === 'PRIVATE' ? `${account.name} (only you)` : account.name}
        </option>
      ))}
    </select>
  )

  if (!label) return control

  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{control}</div>
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}
