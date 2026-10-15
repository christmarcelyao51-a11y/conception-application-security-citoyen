'use client'

import { ChevronRight, FileClock, Video } from 'lucide-react'
import Image from 'next/image'
import { URGENCY_LABELS, type SentAlert } from '@/lib/alert'
import { getService } from '@/lib/services'
import { cn } from '@/lib/utils'

type HistoryScreenProps = {
  alerts: SentAlert[]
  onOpen: (id: string) => void
}

const STATUS_LABELS: Record<SentAlert['status'], string> = {
  envoyee: 'En cours',
  'en-route': 'En route',
  'sur-place': 'Sur place',
  cloturee: 'Clôturée',
  annulee: 'Annulée',
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function HistoryScreen({ alerts, onOpen }: HistoryScreenProps) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-28">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mon activité</p>
          <h1 className="mt-1 text-2xl font-bold">Mes alertes</h1>
          <p className="text-sm text-muted-foreground">Historique de vos signalements</p>
        </div>
        <span className="rounded-lg border bg-card px-2.5 py-1.5 text-xs font-semibold tabular-nums text-muted-foreground">{alerts.length}</span>
      </header>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-secondary"><FileClock className="size-5 text-muted-foreground" aria-hidden="true" /></span>
          <div><p className="text-sm font-semibold">Aucun signalement</p><p className="mt-1 text-xs text-muted-foreground">Vos demandes apparaîtront ici après leur création.</p></div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...alerts].sort((a, b) => b.createdAt - a.createdAt).map((a) => {
            const service = getService(a.serviceId)
            const Icon = service.icon
            const text = a.analysis?.summary || a.description || a.transcript || 'Alerte vidéo'
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onOpen(a.id)}
                  className="flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/25 hover:bg-accent/50"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-1">
                    {service.logo ? <Image src={service.logo} alt="" width={40} height={40} className="size-full object-contain" /> : <Icon className="size-5 text-primary" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{service.label}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          a.status === 'annulee'
                            ? 'bg-secondary text-muted-foreground'
                            : a.status === 'cloturee'
                            ? 'bg-success/10 text-success'
                              : 'bg-primary/15 text-primary',
                        )}
                      >
                        {STATUS_LABELS[a.status]}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">{text}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {dateFormatter.format(a.createdAt)}
                      {a.hasVideo ? (
                        <span className="inline-flex items-center gap-1">
                          <Video className="size-3" aria-hidden="true" /> Vidéo
                        </span>
                      ) : null}
                      {a.analysis ? <span>· Urgence {URGENCY_LABELS[a.analysis.urgencyLevel]}</span> : null}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
