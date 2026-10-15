import type { SentAlert } from './alert'

export const OPERATIONS_STORAGE_KEY = 'security-citoyen-operations-v1'
const OPERATOR_SESSION_KEY = 'security-citoyen-operator-session-v1'
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export function backendFetch(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers })
}

export function readOperatorToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const session = JSON.parse(window.sessionStorage.getItem(OPERATOR_SESSION_KEY) ?? 'null') as { token?: unknown } | null
    return typeof session?.token === 'string' ? session.token : undefined
  } catch {
    return undefined
  }
}

export async function fetchOperations(): Promise<SentAlert[]> {
  const response = await backendFetch('/api/operations', { cache: 'no-store' }, readOperatorToken())
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  const value: unknown = await response.json()
  if (!Array.isArray(value)) throw new Error('Réponse invalide du service de demandes.')
  return value as SentAlert[]
}

export async function fetchOperationStatus(id: string): Promise<Pick<SentAlert, 'id' | 'status' | 'statusUpdatedAt' | 'assignedTo'>> {
  const response = await backendFetch(`/api/operations?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  return response.json()
}

export async function createOperation(alert: SentAlert): Promise<SentAlert> {
  const response = await backendFetch('/api/operations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  })
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  return response.json() as Promise<SentAlert>
}

export async function updateOperationStatus(id: string, status: SentAlert['status'], operatorName?: string): Promise<SentAlert> {
  const response = await backendFetch('/api/operations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status, operatorName }),
  }, operatorName ? readOperatorToken() : undefined)
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  return response.json() as Promise<SentAlert>
}

export function readOperations(): SentAlert[] {
  if (typeof window === 'undefined') return []
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(OPERATIONS_STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? (value as SentAlert[]) : []
  } catch {
    return []
  }
}

export function writeOperations(alerts: SentAlert[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(alerts))
  } catch {
    // The current screen remains usable if browser storage is unavailable.
  }
}
