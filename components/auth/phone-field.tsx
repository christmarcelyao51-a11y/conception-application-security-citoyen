'use client'

import { ChevronDown } from 'lucide-react'
import { COUNTRY_CODES } from '@/lib/auth-demo'

type PhoneFieldProps = {
  countryCode: string
  phone: string
  onCountryCodeChange: (code: string) => void
  onPhoneChange: (phone: string) => void
  autoFocus?: boolean
}

export function PhoneField({ countryCode, phone, onCountryCodeChange, onPhoneChange, autoFocus }: PhoneFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="phone" className="text-sm font-medium">
        Numéro de téléphone
      </label>
      <div className="flex h-14 items-stretch overflow-hidden rounded-xl border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
        <div className="relative flex items-center border-r">
          <label htmlFor="country-code" className="sr-only">
            Indicatif pays
          </label>
          <select
            id="country-code"
            value={countryCode}
            onChange={(e) => onCountryCodeChange(e.target.value)}
            className="h-full appearance-none bg-transparent pr-8 pl-4 font-mono text-base font-medium focus:outline-none"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code} className="bg-card">
                {c.code} {c.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          placeholder="07 00 00 00 00"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value.replace(/[^\d\s]/g, '').slice(0, 14))}
          className="min-w-0 flex-1 bg-transparent px-4 font-mono text-lg tracking-wide placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </div>
    </div>
  )
}
