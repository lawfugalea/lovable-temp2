import React from 'react'
import { cn } from '@/lib/utils'
import { NOTE_COLORS, NOTE_COLOR_KEYS } from './note-utils'
import type { NoteColor } from './types'

interface ColorPickerProps {
  value: string
  onChange: (color: NoteColor) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export default function ColorPicker({ value, onChange, disabled, size = 'md', className }: ColorPickerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      {NOTE_COLOR_KEYS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            'rounded-full border-2 transition-all duration-150 touch-manipulation active:scale-95',
            size === 'md' ? 'h-6 w-6 md:h-5 md:w-5' : 'h-4 w-4',
            NOTE_COLORS[color].swatch,
            value === color ? 'scale-110 border-foreground/60' : 'border-border'
          )}
          title={NOTE_COLORS[color].label}
          aria-label={`${NOTE_COLORS[color].label} note color`}
          aria-pressed={value === color}
        />
      ))}
    </div>
  )
}
