import type { ServiceId } from './services'

export const OPERATOR_COOKIE = 'security-citoyen-operator'
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000
type OperatorSession = { serviceId: ServiceId; name: string; expiresAt: number }

function sessions() {
  const root = globalThis as typeof globalThis & { __securityCitoyenOperatorSessions__?: Map<string, OperatorSession> }
  root.__securityCitoyenOperatorSessions__ ??= new Map()
  return root.__securityCitoyenOperatorSessions__
}

export function createOperatorSession(serviceId: ServiceId, name: string) {
  const token = crypto.randomUUID()
  sessions().set(token, { serviceId, name, expiresAt: Date.now() + SESSION_DURATION_MS })
  return token
}

export function readOperatorSession(request: Request): OperatorSession | null {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const token = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${OPERATOR_COOKIE}=`))?.slice(OPERATOR_COOKIE.length + 1)
  if (!token) return null
  const session = sessions().get(decodeURIComponent(token))
  if (!session || session.expiresAt <= Date.now()) {
    sessions().delete(decodeURIComponent(token))
    return null
  }
  return session
}

export function removeOperatorSession(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const token = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${OPERATOR_COOKIE}=`))?.slice(OPERATOR_COOKIE.length + 1)
  if (token) sessions().delete(decodeURIComponent(token))
}
