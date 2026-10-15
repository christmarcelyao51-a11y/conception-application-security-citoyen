'use client'

import { ArrowLeft, Check, Clock, MessageSquare, Navigation, Phone, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { LazyMap } from '@/components/map/lazy-map'
import { URGENCY_LABELS, type SentAlert } from '@/lib/alert'
import { distanceKm, formatDistance, interpolate } from '@/lib/geo'
import { getService } from '@/lib/services'
import { cn } from '@/lib/utils'

const TRAVEL_DEMO_MS = 60000

type TrackingScreenProps = {
  alert: SentAlert
  onBack: () => void
  onCancel: (id: string) => void
  syncState?: 'syncing' | 'synced' | 'offline'
  onRetrySync?: () => void
}

export function TrackingScreen({ alert, onBack, onCancel, syncState, onRetrySync }: TrackingScreenProps) {
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

  const steps = [
    { label: 'Demande enregistrée sur cet appareil', done: true },
    { label: 'Demande transmise au centre', done: syncState === 'synced' },
    { label: 'Prise en charge par le centre', done: assigned },
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

        <section className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm" aria-live="polite">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background p-1',
              cancelled ? 'opacity-60' : arrived ? 'border-success/30' : 'border-primary/20',
            )}
          >
            {service.logo ? <Image src={service.logo} alt="" width={40} height={40} className="size-full object-contain" /> : <Icon className="size-6 text-primary" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{service.label}</p>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', arrived ? 'bg-success/10 text-success' : cancelled ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary')}>
                {cancelled ? 'Annulée' : arrived ? 'Sur place' : alert.status === 'en-route' ? 'En déplacement' : syncState === 'synced' ? 'Reçue par le centre' : 'En attente'}
              </span>
            </div>
            <h1 className="mt-1 text-lg font-bold leading-snug text-balance">
              {cancelled
                ? 'Alerte annulée'
                : arrived
                  ? 'Les secours sont sur place'
                  : assigned
                    ? 'Une équipe est en déplacement'
                    : syncState === 'synced'
                      ? 'Demande reçue par le centre'
                      : 'En attente de confirmation du centre'}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Référence {alert.id.slice(-6).toUpperCase()} · signalée à {new Date(alert.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </section>

        {syncState === 'offline' ? (
          <section role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <h2 className="text-sm font-semibold text-destructive">Transmission au centre non confirmée</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              La demande est enregistrée sur cet appareil, mais le centre n’a pas confirmé sa réception. Appelez directement le service d’urgence pour signaler la situation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {service.phone ? (
                <a href={`tel:${service.phone}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-destructive px-3 text-sm font-semibold text-white">
                  <Phone className="size-4" aria-hidden="true" /> Appeler le {service.phone}
                </a>
              ) : null}
              <button type="button" onClick={onRetrySync} className="h-10 rounded-lg border px-3 text-sm font-semibold">
                Réessayer l’envoi
              </button>
            </div>
          </section>
        ) : syncState === 'syncing' ? (
          <p role="status" className="rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground">
            Transmission au centre en cours…
          </p>
        ) : null}

        {!cancelled ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border bg-card p-3">
              <Navigation className="mb-1 size-4 text-muted-foreground" aria-hidden="true" />
              <p className="font-mono text-lg font-semibold">{formatDistance(totalKm)}</p>
              <p className="text-xs text-muted-foreground">distance indicative</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <span className="mb-1 block size-4 rounded-full bg-primary/20 p-1" aria-hidden="true">
                <span className="block size-2 rounded-full bg-primary" />
              </span>
              <p className="text-lg font-semibold">
                {alert.analysis ? URGENCY_LABELS[alert.analysis.urgencyLevel] : 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground">niveau de priorité</p>
            </div>
          </div>
        ) : null}

        <section aria-labelledby="timeline-title" className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="timeline-title" className="text-sm font-semibold">
            Suivi de l’intervention
            </h2>
            <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
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
          La distance est calculée à vol d’oiseau. Le déplacement affiché sur la carte est indicatif.
        </p>
      </main>
    </div>
  )
}
