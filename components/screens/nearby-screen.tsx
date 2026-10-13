'use client'

import { useMemo, useState } from 'react'
import { LazyMap } from '@/components/map/lazy-map'
import type { GeoState } from '@/hooks/use-geolocation'
import { distanceKm, formatDistance, getNearbyStations } from '@/lib/geo'
import { SERVICES, getService, type ServiceId } from '@/lib/services'
import { cn } from '@/lib/utils'

type NearbyScreenProps = {
  geo: GeoState
  onStartAlert: (serviceId: ServiceId) => void
}

export function NearbyScreen({ geo, onStartAlert }: NearbyScreenProps) {
  const [filter, setFilter] = useState<ServiceId | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | undefined>()

  const stations = useMemo(() => {
    const all = getNearbyStations(geo.position)
      .filter((s) => filter === 'all' || s.serviceId === filter)
      .map((s) => ({ ...s, distance: distanceKm(geo.position, s.position) }))
    return all.sort((a, b) => a.distance - b.distance)
  }, [geo.position, filter])

  return (
    <div className="flex flex-col pb-28">
      <div className="relative h-[52dvh] min-h-72 w-full">
        <LazyMap user={geo.position} accuracy={geo.accuracy} stations={stations} highlightStationId={selectedId} />
        <div className="absolute inset-x-0 top-0 z-[500] bg-gradient-to-b from-background/90 to-transparent px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6">
          <h1 className="text-lg font-bold">Services à proximité</h1>
          <p className="text-xs text-muted-foreground">
            {geo.status === 'granted' ? 'Autour de votre position actuelle' : 'Position par défaut — activez le GPS'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3" role="radiogroup" aria-label="Filtrer par service">
        {[{ id: 'all' as const, label: 'Tous' }, ...SERVICES].map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={filter === s.id}
            onClick={() => setFilter(s.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium',
              filter === s.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-secondary',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2 px-4">
        {stations.map((s) => {
          const service = getService(s.serviceId)
          const Icon = service.icon
          const eta = Math.max(1, Math.ceil((s.distance / 40) * 60))
          return (
            <li key={s.id}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-2xl border bg-card p-3',
                  selectedId === s.id && 'border-warning',
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {service.label} · {formatDistance(s.distance)} · ~{eta} min
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartAlert(s.serviceId)}
                  className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                >
                  Alerter
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
