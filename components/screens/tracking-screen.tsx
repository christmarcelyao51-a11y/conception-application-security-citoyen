'use client'

import { ArrowLeft, Check, Clock, MessageSquare, Navigation, Phone, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LazyMap } from '@/components/map/lazy-map'
import { URGENCY_LABELS, type SentAlert } from '@/lib/alert'
import { distanceKm, formatDistance, interpolate } from '@/lib/geo'
import { getService } from '@/lib/services'
import { cn } from '@/lib/utils'

const TRAVEL_DEMO_MS = 60000
const AVG_SPEED_KMH = 40

type TrackingScreenProps = {
  alert: SentAlert
  onBack: () => void
  onCancel: (id: string) => void
}

export function TrackingScreen({ alert, onBack, onCancel }: TrackingScreenProps) {
  const [now, setNow] = useState(() => Date.now())
  const service = getService(alert.serviceId)
  const Icon = service.icon

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const cancelled = alert.status === 'annulee'
  const assigned = ['en-route', 'sur-place', 'cloturee'].includes(alert.status)
  const elapsed = now - (alert.statusUpdatedAt ?? alert.createdAt)
  const progress = alert.status === 'sur-place' || alert.status === 'cloturee'
    ? 1
    : alert.status === 'en-route'
      ? Math.min(Math.max(elapsed / TRAVEL_DEMO_MS, 0), 0.95)
      : 0
  const arrived = ['sur-place', 'cloturee'].includes(alert.status)

  const from = alert.station.position
  const to = alert.userPosition
  const unitPos = interpolate(from, to, progress)
  const totalKm = distanceKm(from, to)
  const remainingKm = distanceKm(unitPos, to)
  const etaMin = Math.max(1, Math.ceil((remainingKm / AVG_SPEED_KMH) * 60))

  const steps = [
    { label: 'Alerte reçue par le centre', done: true },
    { label: alert.analysis ? 'Analysée par l’IA' : 'Qualifiée par un opérateur', done: now - alert.createdAt > 1500 },
    { label: `Unité assignée : ${service.unitName}`, done: assigned },
    { label: 'En route vers votre position', done: alert.status === 'en-route' || arrived },
    { label: 'Arrivée sur place', done: arrived },
  ]

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="relative h-[46dvh] min-h-72 w-full">
        <LazyMap
          user={to}
          stations={[alert.station]}
          highlightStationId={alert.station.id}
          unit={assigned && !cancelled ? { position: unitPos, label: service.unitName } : undefined}
          route={[from, to]}
        />
        <button
          type="button"
          onClick={onBack}
          className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 z-[500] flex size-10 items-center justify-center rounded-full bg-background/90 shadow-lg"
          aria-label="Retour à l’accueil"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-[500] rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-lg">
          Alerte #{alert.id.slice(-6).toUpperCase()}
        </div>
      </div>

      <main className="-mt-6 relative z-10 flex flex-1 flex-col gap-4 rounded-t-3xl border-t bg-background px-4 pt-5 pb-8">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-secondary" aria-hidden="true" />

        <section className="flex items-center gap-4" aria-live="polite">
          <div
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-2xl',
              cancelled ? 'bg-secondary' : arrived ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary',
            )}
          >
            <Icon className="size-7" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{service.label}</p>
            <h1 className="text-xl font-bold text-balance">
              {cancelled
                ? 'Alerte annulée'
                : arrived
                  ? 'Les secours sont sur place'
                  : assigned
                    ? `Arrivée dans ~${etaMin} min`
                    : 'Demande transmise, en attente de prise en charge'}
            </h1>
          </div>
        </section>

        {!cancelled ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-card p-3">
              <Clock className="mb-1 size-4 text-muted-foreground" aria-hidden="true" />
              <p className="font-mono text-lg font-semibold">{arrived ? '0' : assigned ? etaMin : '—'}</p>
              <p className="text-xs text-muted-foreground">min restantes</p>
            </div>
            <div className="rounded-xl bg-card p-3">
              <Navigation className="mb-1 size-4 text-muted-foreground" aria-hidden="true" />
              <p className="font-mono text-lg font-semibold">{formatDistance(remainingKm)}</p>
              <p className="text-xs text-muted-foreground">sur {formatDistance(totalKm)}</p>
            </div>
            <div className="rounded-xl bg-card p-3">
              <span className="mb-1 block size-4 rounded-full bg-primary/20 p-1" aria-hidden="true">
                <span className="block size-2 rounded-full bg-primary" />
              </span>
              <p className="text-lg font-semibold">
                {alert.analysis ? URGENCY_LABELS[alert.analysis.urgencyLevel] : 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground">urgence IA</p>
            </div>
          </div>
        ) : null}

        {!cancelled ? (
          <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progression de l’unité">
            <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${progress * 100}%` }} />
          </div>
        ) : null}

        <section aria-labelledby="timeline-title" className="rounded-2xl border bg-card p-4">
          <h2 id="timeline-title" className="mb-3 text-sm font-semibold">
            Suivi de l’intervention
          </h2>
          <ol className="flex flex-col gap-3">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full',
                    step.done ? 'bg-success text-background' : 'border border-input',
                  )}
                >
                  {step.done ? <Check className="size-3.5" aria-hidden="true" /> : null}
                </span>
                <span className={step.done ? '' : 'text-muted-foreground'}>{step.label}</span>
              </li>
            ))}
          </ol>
        </section>

        {alert.analysis ? (
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-1 text-sm font-semibold">Résumé transmis aux secours</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{alert.analysis.summary}</p>
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {service.phone ? (
            <a
              href={`tel:${service.phone}`}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-success font-semibold text-background"
            >
              <Phone className="size-4" aria-hidden="true" />
              Appeler le {service.phone}
            </a>
          ) : (
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-success font-semibold text-background"
            >
              <Phone className="size-4" aria-hidden="true" />
              Rappel opérateur
            </button>
          )}
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary font-semibold"
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            Message
          </button>
        </div>

        {!cancelled && !arrived ? (
          <button
            type="button"
            onClick={() => onCancel(alert.id)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
            Annuler l’alerte (fausse manipulation)
          </button>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Démonstration : le déplacement de l’unité est simulé.
        </p>
      </main>
    </div>
  )
}
