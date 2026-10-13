import type { SentAlert } from './alert'

export const OPERATIONS_STORAGE_KEY = 'security-citoyen-operations-v1'

export async function fetchOperations(): Promise<SentAlert[]> {
  const response = await fetch('/api/operations', { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  const value: unknown = await response.json()
  if (!Array.isArray(value)) throw new Error('Réponse invalide du service de demandes.')
  return value as SentAlert[]
}

export async function fetchOperationStatus(id: string): Promise<Pick<SentAlert, 'id' | 'status' | 'statusUpdatedAt' | 'assignedTo'>> {
  const response = await fetch(`/api/operations?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  return response.json()
}

export async function createOperation(alert: SentAlert): Promise<SentAlert> {
  const response = await fetch('/api/operations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  })
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  return response.json() as Promise<SentAlert>
}

export async function updateOperationStatus(id: string, status: SentAlert['status'], operatorName?: string): Promise<SentAlert> {
  const response = await fetch('/api/operations', {
    method: 'PATCH',
    credentials: operatorName ? 'same-origin' : 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status, operatorName }),
  })
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
