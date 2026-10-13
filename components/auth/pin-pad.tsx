'use client'

import { Delete } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

type PinPadProps = {
  value: string
  onChange: (value: string) => void
  onComplete: (value: string) => void
  length?: number
  invalid?: boolean
  disabled?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

export function PinPad({ value, onChange, onComplete, length = 6, invalid, disabled }: PinPadProps) {
  function press(key: string) {
    if (disabled) return
    if (key === 'del') {
      onChange(value.slice(0, -1))
      return
    }
    if (value.length >= length) return
    const next = value + key
    onChange(next)
    if (next.length === length) onComplete(next)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex flex-col items-center gap-10">
      <div
        className={cn('flex gap-4', invalid && 'animate-[shake_0.35s_ease-in-out]')}
        role="status"
        aria-label={`${value.length} chiffres saisis sur ${length}`}
      >
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'size-4 rounded-full border-2 transition-all',
              i < value.length ? 'scale-110 border-primary bg-primary' : 'border-muted-foreground/40',
              invalid && 'border-destructive bg-destructive',
            )}
          />
        ))}
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-4">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => press(key)}
              aria-label={key === 'del' ? 'Effacer' : key}
              className={cn(
                'flex aspect-square items-center justify-center rounded-full text-2xl font-medium transition-colors active:scale-95',
                key === 'del' ? 'text-muted-foreground hover:bg-secondary' : 'bg-card hover:bg-secondary',
              )}
            >
              {key === 'del' ? <Delete className="size-6" aria-hidden="true" /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
