'use client'

import { ChevronRight, MapPin, Mic, Video } from 'lucide-react'
import Image from 'next/image'
import type { GeoState } from '@/hooks/use-geolocation'
import type { SentAlert } from '@/lib/alert'
import type { PublicAccount } from '@/lib/auth-demo'
import { SERVICES, getService, type ServiceId } from '@/lib/services'

type HomeScreenProps = {
  user: PublicAccount
  alertCount: number
  geo: GeoState
  activeAlert: SentAlert | null
  onStartAlert: (serviceId: ServiceId, mode?: 'video' | 'voice' | 'text') => void
  onOpenTracking: () => void
}

function LocationLabel({ geo }: { geo: GeoState }) {
  if (geo.status === 'granted') return <span className="text-xs">Position disponible</span>
  if (geo.status === 'pending') return <span className="text-xs">Localisation en cours</span>
  return <span className="text-xs text-warning">GPS à activer</span>
}

export function HomeScreen({ user, alertCount, geo, activeAlert, onStartAlert, onOpenTracking }: HomeScreenProps) {
  return (
    <div className="flex flex-col gap-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
      <header className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-md shadow-black/15 ring-1 ring-white/20">
            <Image src="/images/security-citoyen-logo.png" alt="" width={48} height={48} className="size-full object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">SECURITY CITOYEN</p>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground">Assistance · Côte d’Ivoire</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5">
          <MapPin
            className={geo.status === 'granted' ? 'size-3.5 text-success' : 'size-3.5 text-muted-foreground'}
            aria-hidden="true"
          />
          <LocationLabel geo={geo} />
        </div>
      </header>

      {activeAlert ? (
        <button
          type="button"
          onClick={onOpenTracking}
          className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.06] p-3.5 text-left transition-colors hover:bg-primary/10"
        >
          <span className="relative flex size-3 shrink-0">
            <span className="sos-ring absolute inset-0 rounded-full bg-primary" aria-hidden="true" />
            <span className="relative size-3 rounded-full bg-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Demande en cours · {getService(activeAlert.serviceId).label}</span>
            <span className="block text-xs text-muted-foreground">Consulter le statut et les informations de suivi</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
        </button>
      ) : null}

      <section aria-labelledby="sos-title" className="relative isolate flex min-h-[25rem] flex-col justify-between overflow-hidden rounded-3xl border border-white/10 px-5 py-5 shadow-xl shadow-black/20">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <Image
            src="/images/welcome-hero.png"
            alt=""
            fill
            priority
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover object-[50%_42%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07111f]/75 via-[#07111f]/25 to-[#07111f]/95" />
          <div className="absolute inset-0 bg-primary/5 mix-blend-screen" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-success shadow-[0_0_10px_var(--success)]" />
            Bonjour {user.firstName}
          </span>
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur-md">
            Services d’urgence
          </span>
        </div>

        <div className="flex flex-col items-center gap-4 pb-1 text-center">
          <div className="relative flex size-36 items-center justify-center">
            <span className="sos-ring absolute inset-1 rounded-full bg-primary/35" aria-hidden="true" />
            <span className="sos-ring sos-ring-delay absolute inset-1 rounded-full bg-primary/25" aria-hidden="true" />
            <button
              type="button"
              onClick={() => onStartAlert('autre', 'video')}
              className="sos-button-breathe relative flex size-28 flex-col items-center justify-center rounded-full border border-white/25 bg-primary text-primary-foreground shadow-[0_10px_28px_oklch(0.62_0.22_25_/_0.35)] ring-4 ring-white/10 transition duration-200 hover:bg-primary/90 active:scale-95"
              aria-label="Lancer une alerte SOS immédiate"
            >
              <span className="text-3xl font-black tracking-wider">SOS</span>
              <span className="mt-0.5 text-[11px] font-semibold">Alerte immédiate</span>
            </button>
          </div>
          <div className="max-w-xs">
              <h1 id="sos-title" className="text-xl font-bold tracking-tight text-balance text-white">
              Besoin d’aide immédiate ?
            </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-white/80 text-pretty">
              Décrivez la situation et partagez votre position avec les services concernés.
            </p>
          </div>
        </div>
      </section>

      <div className="-mt-1 flex justify-center gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onStartAlert('autre', 'voice')}
            className="inline-flex h-11 items-center gap-2 rounded-full border bg-card/90 px-4 text-sm font-semibold shadow-lg shadow-black/10 backdrop-blur transition hover:border-primary/40 hover:bg-accent"
          >
            <Mic className="size-4" aria-hidden="true" />
            Alerte vocale
          </button>
          <button
            type="button"
            onClick={() => onStartAlert('autre', 'video')}
            className="inline-flex h-11 items-center gap-2 rounded-full border bg-card/90 px-4 text-sm font-semibold shadow-lg shadow-black/10 backdrop-blur transition hover:border-primary/40 hover:bg-accent"
          >
            <Video className="size-4" aria-hidden="true" />
            Filmer
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {alertCount === 0 ? 'Aucune alerte envoyée' : `${alertCount} alerte${alertCount > 1 ? 's' : ''} envoyée${alertCount > 1 ? 's' : ''}`}
      </p>

      <section aria-labelledby="services-title" className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h2 id="services-title" className="text-base font-semibold">
            Choisir un service d’urgence
          </h2>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {SERVICES.map((s, index) => {
            const Icon = s.icon
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onStartAlert(s.id)}
                  className="service-card-enter group flex h-full w-full flex-col items-start gap-3 rounded-2xl border bg-gradient-to-br from-card to-secondary/50 p-4 text-left shadow-sm shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/20"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <span className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-white/20 transition group-hover:scale-105">
                    {s.logo ? (
                      <Image src={s.logo} alt={`${s.label} — emblème`} width={48} height={48} className="size-full object-contain p-1" />
                    ) : (
                      <Icon className="size-5 text-primary" aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <span className="block font-semibold">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.description}</span>
                  </span>
                  {s.phone ? (
                    <span className="mt-auto rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">{s.phone}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border bg-gradient-to-br from-card to-secondary/40 p-4 shadow-sm shadow-black/10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">En quelques étapes</p>
        <h2 className="mt-1 text-base font-semibold">Comment ça marche</h2>
        <ol className="mt-3 flex flex-col gap-3 text-sm">
          {[
            'Choisissez le service ou appuyez sur SOS.',
            'Filmez, parlez ou écrivez ce qui se passe.',
            'Les informations transmises aident le centre à évaluer la demande.',
            'Consultez les mises à jour du statut dans votre historique.',
          ].map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>

    </div>
  )
}
