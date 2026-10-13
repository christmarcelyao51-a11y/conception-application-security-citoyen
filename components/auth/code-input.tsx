'use client'

import { useId, useRef } from 'react'
import { cn } from '@/lib/utils'

type CodeInputProps = {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  length?: number
  label: string
  masked?: boolean
  invalid?: boolean
  autoFocus?: boolean
}

export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  label,
  masked = false,
  invalid = false,
  autoFocus = true,
}: CodeInputProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative" onClick={() => inputRef.current?.focus()}>
        <input
          ref={inputRef}
          id={id}
          value={value}
          autoFocus={autoFocus}
          inputMode="numeric"
          autoComplete={masked ? 'off' : 'one-time-code'}
          pattern="\d*"
          maxLength={length}
          aria-invalid={invalid}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, '').slice(0, length)
            onChange(next)
            if (next.length === length) onComplete?.(next)
          }}
          className="peer absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div className={cn('grid gap-2', invalid && 'animate-[shake_0.3s_ease-in-out]')} style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }} aria-hidden="true">
          {Array.from({ length }).map((_, i) => {
            const char = value[i]
            const isActive = i === Math.min(value.length, length - 1)
            return (
              <div
                key={i}
                className={cn(
                  'flex aspect-[4/5] items-center justify-center rounded-xl border bg-card text-2xl font-semibold transition-colors',
                  char && 'border-foreground/30',
                  isActive && 'peer-focus:border-primary',
                  invalid && 'border-destructive text-destructive',
                )}
              >
                {char ? (masked ? <span className="size-3 rounded-full bg-foreground" /> : char) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
