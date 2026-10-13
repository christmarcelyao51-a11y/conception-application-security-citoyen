'use client'

import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type AuthStepProps = {
  title: string
  subtitle?: ReactNode
  step?: { current: number; total: number }
  onBack?: () => void
  children: ReactNode
  footer?: ReactNode
}

export function AuthStep({ title, subtitle, step, onBack, children, footer }: AuthStepProps) {
  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex h-12 items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Retour"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
        {step ? (
          <div className="flex items-center gap-1.5" aria-label={`Étape ${step.current} sur ${step.total}`}>
            {Array.from({ length: step.total }).map((_, i) => (
              <span
                key={i}
                className={
                  i < step.current
                    ? 'h-1.5 w-6 rounded-full bg-primary'
                    : 'h-1.5 w-6 rounded-full bg-secondary'
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      <header className="mt-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
        {subtitle ? <div className="text-sm leading-relaxed text-muted-foreground text-pretty">{subtitle}</div> : null}
      </header>

      <div className="mt-8 flex flex-1 flex-col gap-5">{children}</div>

      {footer ? <div className="mt-6 flex flex-col gap-3">{footer}</div> : null}
    </div>
  )
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = 'button',
  form,
}: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  form?: string
}) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
    >
      {children}
    </button>
  )
}

export function TextField({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="h-12 rounded-xl border bg-card px-4 text-base placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
      />
    </div>
  )
}
