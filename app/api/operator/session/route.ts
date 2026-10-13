import { NextResponse } from 'next/server'
import { createOperatorSession, OPERATOR_COOKIE, readOperatorSession, removeOperatorSession } from '@/lib/operator-session'
import { SERVICES, type ServiceId } from '@/lib/services'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const cookieOptions = `Path=/api; HttpOnly; SameSite=Strict; Max-Age=${12 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`

export async function GET(request: Request) {
  const session = readOperatorSession(request)
  if (!session) return NextResponse.json({ error: 'Session opérateur expirée.' }, { status: 401 })
  return NextResponse.json({ serviceId: session.serviceId, name: session.name }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  let body: { serviceId?: unknown; identifier?: unknown; password?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 }) }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 400 })
  const service = SERVICES.find((item) => item.id === body.serviceId)
  const serviceKey = service?.id.toUpperCase().replace(/[^A-Z0-9]/g, '_') ?? ''
  const expectedIdentifier = process.env[`OPERATOR_${serviceKey}_USERNAME`] ?? process.env.OPERATOR_DEMO_USERNAME ?? 'operateur'
  const expectedPassword = process.env[`OPERATOR_${serviceKey}_PASSWORD`] ?? process.env.OPERATOR_DEMO_PASSWORD ?? 'demo2026'
  if (!service || body.identifier !== expectedIdentifier || body.password !== expectedPassword) {
    return NextResponse.json({ error: 'Service ou identifiants incorrects.' }, { status: 401 })
  }
  const token = createOperatorSession(service.id as ServiceId, String(body.identifier))
  const response = NextResponse.json({ serviceId: service.id, name: String(body.identifier) }, { headers: { 'Cache-Control': 'no-store' } })
  response.headers.set('Set-Cookie', `${OPERATOR_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions}`)
  return response
}

export async function DELETE(request: Request) {
  removeOperatorSession(request)
  const response = NextResponse.json({ success: true })
  response.headers.set('Set-Cookie', `${OPERATOR_COOKIE}=; ${cookieOptions.replace(`Max-Age=${12 * 60 * 60}`, 'Max-Age=0')}`)
  return response
}
