export type Account = {
  id: string
  phone: string
  firstName: string
  lastName: string
  city: string
  birthDate: string
  pinHash: string
  createdAt: number
}

export type PublicAccount = Omit<Account, 'pinHash'>

export type RegistrationDraft = {
  countryCode: string
  phone: string
  firstName: string
  lastName: string
  city: string
  birthDate: string
}

export const COUNTRY_CODES = [
  { code: '+225', label: 'Côte d’Ivoire' },
  { code: '+221', label: 'Sénégal' },
  { code: '+223', label: 'Mali' },
  { code: '+226', label: 'Burkina Faso' },
  { code: '+229', label: 'Bénin' },
  { code: '+228', label: 'Togo' },
  { code: '+237', label: 'Cameroun' },
  { code: '+33', label: 'France' },
] as const

export function normalizePhone(countryCode: string, phone: string) {
  return `${countryCode}${phone.replace(/\D/g, '')}`
}

export function formatPhone(full: string) {
  const match = full.match(/^(\+\d{2,3})(\d+)$/)
  if (!match) return full
  const [, cc, rest] = match
  return `${cc} ${rest.replace(/(\d{2})(?=\d)/g, '$1 ')}`
}

export function generateOtp() {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return String(buf[0] % 1_000_000).padStart(6, '0')
}

export async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const WEAK_PINS = new Set(['000000', '111111', '123456', '654321', '121212', '112233'])

export function pinWeakness(pin: string): string | null {
  if (WEAK_PINS.has(pin)) return 'Code trop simple, choisissez-en un autre.'
  if (/^(\d)\1{5}$/.test(pin)) return 'Évitez les chiffres identiques.'
  return null
}
