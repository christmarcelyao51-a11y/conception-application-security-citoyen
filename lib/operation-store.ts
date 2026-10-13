import type { AlertStatus, SentAlert } from './alert'

type OperationStore = { operations: SentAlert[] }

function getStore(): OperationStore {
  const root = globalThis as typeof globalThis & { __securityCitoyenOperationStore__?: OperationStore }
  root.__securityCitoyenOperationStore__ ??= { operations: [] }
  return root.__securityCitoyenOperationStore__
}

export function listOperations() {
  return getStore().operations
}

export function findOperation(id: string) {
  return getStore().operations.find((operation) => operation.id === id) ?? null
}

export function addOperation(alert: SentAlert) {
  const operations = getStore().operations
  const existing = operations.findIndex((item) => item.id === alert.id)
  if (existing >= 0) operations[existing] = alert
  else operations.unshift(alert)
  return alert
}

export function changeOperationStatus(id: string, status: AlertStatus, operatorName?: string) {
  const item = findOperation(id)
  if (!item) return null
  if (status === 'en-route') {
    if (item.status !== 'envoyee') return 'conflict' as const
    item.assignedTo = operatorName || 'Opérateur de permanence'
  }
  if (status === 'sur-place' && item.status !== 'en-route') return 'conflict' as const
  if (status === 'cloturee' && item.status !== 'sur-place') return 'conflict' as const
  item.status = status
  item.statusUpdatedAt = Date.now()
  return item
}
