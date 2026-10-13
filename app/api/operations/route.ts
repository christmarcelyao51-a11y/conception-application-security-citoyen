import { NextResponse } from 'next/server'
import { addOperation, changeOperationStatus, findOperation, listOperations } from '@/lib/operation-store'
import type { AlertStatus, SentAlert } from '@/lib/alert'
import { SERVICES } from '@/lib/services'
import { readOperatorSession } from '@/lib/operator-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const statuses: AlertStatus[] = ['envoyee', 'en-route', 'sur-place', 'cloturee', 'annulee']

export async function GET(request: Request) {
  const session = readOperatorSession(request)
  const id = new URL(request.url).searchParams.get('id')
  if (id) {
    const alert = findOperation(id)
    if (!alert) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
    return NextResponse.json({ id: alert.id, status: alert.status, statusUpdatedAt: alert.statusUpdatedAt, assignedTo: alert.assignedTo }, { headers: { 'Cache-Control': 'no-store' } })
  }
  if (!session) {
    return NextResponse.json({ error: 'Connexion opérateur requise.' }, { status: 401 })
  }
  return NextResponse.json(listOperations().filter((alert) => alert.serviceId === session.serviceId), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 }) }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Demande invalide.' }, { status: 400 })
  const alert = body as SentAlert
  if (
    typeof alert.id !== 'string' ||
    typeof alert.createdAt !== 'number' ||
    !SERVICES.some((service) => service.id === alert.serviceId) ||
    !alert.userPosition || typeof alert.userPosition.lat !== 'number' || typeof alert.userPosition.lng !== 'number' ||
    !alert.station || typeof alert.station.position?.lat !== 'number' || typeof alert.station.position?.lng !== 'number' ||
    alert.status !== 'envoyee' || !statuses.includes(alert.status)
  ) return NextResponse.json({ error: 'Données de demande incomplètes.' }, { status: 400 })

  return NextResponse.json(addOperation(alert), { status: 201, headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: Request) {
  let body: { id?: unknown; status?: unknown; operatorName?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 }) }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Mise à jour invalide.' }, { status: 400 })
  if (typeof body.id !== 'string' || !statuses.includes(body.status as AlertStatus)) {
    return NextResponse.json({ error: 'Mise à jour invalide.' }, { status: 400 })
  }
  const session = readOperatorSession(request)
  if (!session && body.status !== 'annulee') return NextResponse.json({ error: 'Connexion opérateur requise.' }, { status: 401 })
  const existing = findOperation(body.id)
  if (!existing || (session && existing.serviceId !== session.serviceId)) return NextResponse.json({ error: 'Demande introuvable pour ce service.' }, { status: 404 })
  const operation = changeOperationStatus(body.id, body.status as AlertStatus, session?.name)
  if (!operation) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
  if (operation === 'conflict') return NextResponse.json({ error: 'Cette demande a déjà été prise en charge ou son statut a changé.' }, { status: 409 })
  return NextResponse.json(operation, { headers: { 'Cache-Control': 'no-store' } })
}
