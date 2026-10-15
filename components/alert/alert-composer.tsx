'use client'

import { ArrowLeft, Keyboard, MapPin, Mic, Send, Video } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import type { Analysis } from '@/lib/analysis'
import type { GeoState } from '@/hooks/use-geolocation'
import { SERVICES, getService, type ServiceId } from '@/lib/services'
import { cn } from '@/lib/utils'
import { AiAnalysisCard } from './ai-analysis-card'
import { ManualInput } from './manual-input'
import { VideoCapture } from './video-capture'
import { VoiceInput } from './voice-input'

type Mode = 'video' | 'voice' | 'text'

const MODES: { id: Mode; label: string; icon: typeof Video }[] = [
  { id: 'video', label: 'Vidéo direct', icon: Video },
  { id: 'voice', label: 'Vocal', icon: Mic },
  { id: 'text', label: 'Texte', icon: Keyboard },
]

export type ComposedAlert = {
  serviceId: ServiceId
  description: string
  transcript: string
  hasVideo: boolean
  analysis: Analysis | null
}

type AlertComposerProps = {
  initialService: ServiceId
  initialMode?: Mode
  geo: GeoState
  onBack: () => void
  onSend: (alert: ComposedAlert) => void
}

export function AlertComposer({ initialService, initialMode = 'video', geo, onBack, onSend }: AlertComposerProps) {
  const [serviceId, setServiceId] = useState<ServiceId>(initialService)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [description, setDescription] = useState('')
  const [transcript, setTranscript] = useState('')
  const [frames, setFrames] = useState<string[]>([])
  const [hasVideo, setHasVideo] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const service = getService(serviceId)
  const hasContent = description.trim().length > 0 || transcript.trim().length > 0 || frames.length > 0

  async function analyze() {
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          description,
          transcript,
          frames,
          location:
            geo.status === 'granted'
              ? { ...geo.position, accuracy: geo.accuracy ?? undefined }
              : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analyse impossible')
      setAnalysis(data as Analysis)
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Analyse impossible')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="flex size-10 items-center justify-center rounded-full bg-secondary"
            aria-label="Retour"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Nouvelle alerte</p>
            <h1 className="truncate text-lg font-bold">{service.label}</h1>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3" role="radiogroup" aria-label="Service d’urgence">
          {SERVICES.map((s) => {
            const Icon = s.icon
            const active = s.id === serviceId
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setServiceId(s.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent',
                )}
              >
                {s.logo ? <Image src={s.logo} alt="" width={18} height={18} className="size-4 object-contain" /> : <Icon className="size-4" aria-hidden="true" />}
                {s.label}
              </button>
            )
          })}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-4 pt-4 pb-32">
        <section className="relative isolate overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.12] via-card to-card p-4 shadow-sm">
          <div className="pointer-events-none absolute -right-8 -top-8 -z-10 size-36 rounded-full bg-primary/10 blur-2xl" />
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background shadow-sm">
              {service.logo ? <Image src={service.logo} alt="" width={40} height={40} className="size-10 object-contain p-1" /> : <service.icon className="size-6 text-primary" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Demande de secours</p>
              <h2 className="mt-1 text-lg font-bold leading-tight">Que se passe-t-il ?</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Ajoutez quelques détails pour aider le service {service.label} à préparer sa réponse.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5" aria-label="Étapes de l’alerte">
            <div className="flex items-center gap-1.5 rounded-lg bg-success/10 px-2 py-2 text-[10px] font-semibold text-success"><span className="flex size-4 items-center justify-center rounded-full bg-success text-[9px] text-white">✓</span>Service choisi</div>
            <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-2 text-[10px] font-semibold text-primary"><span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">2</span>Situation</div>
            <div className="flex items-center gap-1.5 rounded-lg bg-background/75 px-2 py-2 text-[10px] font-semibold"><span className="flex size-4 items-center justify-center rounded-full bg-secondary text-[9px]">3</span>Envoi</div>
          </div>
        </section>

        <div className={cn('flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors', geo.status === 'granted' ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5')}>
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', geo.status === 'granted' ? 'bg-success/10' : 'bg-warning/10')}>
            <MapPin className={cn('size-4', geo.status === 'granted' ? 'text-success' : 'text-warning')} aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm">
            {geo.status === 'granted' ? (
              <>
                Position partagée{' '}
                <span className="font-mono text-xs text-muted-foreground">
                  {geo.position.lat.toFixed(5)}, {geo.position.lng.toFixed(5)}
                </span>
              </>
            ) : geo.status === 'pending' ? (
              'Localisation en cours…'
            ) : (
              <span className="text-warning">Localisation indisponible — activez le GPS</span>
            )}
          </p>
          {geo.accuracy ? (
            <span className="shrink-0 text-xs text-muted-foreground">±{Math.round(geo.accuracy)} m</span>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between gap-2">
            <div><h3 className="text-sm font-bold">Choisissez comment décrire l’urgence</h3><p className="mt-0.5 text-xs text-muted-foreground">La vidéo, la voix ou le texte sont facultatifs.</p></div>
          </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1" role="tablist" aria-label="Mode de saisie">
          {MODES.map((m) => {
            const Icon = m.icon
            const active = m.id === mode
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                id={`tab-${m.id}`}
                aria-selected={active}
                aria-controls={`panel-${m.id}`}
                onClick={() => setMode(m.id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {m.label}
              </button>
            )
          })}
        </div>
        </div>

        <div role="tabpanel" id="panel-video" aria-labelledby="tab-video" hidden={mode !== 'video'}>
          <VideoCapture onFramesChange={setFrames} onRecordedChange={setHasVideo} />
        </div>
        <div role="tabpanel" id="panel-voice" aria-labelledby="tab-voice" hidden={mode !== 'voice'}>
          <VoiceInput transcript={transcript} onTranscriptChange={setTranscript} />
        </div>
        <div role="tabpanel" id="panel-text" aria-labelledby="tab-text" hidden={mode !== 'text'}>
          <ManualInput value={description} onChange={setDescription} />
        </div>

        <AiAnalysisCard
          analysis={analysis}
          loading={analyzing}
          error={analysisError}
          canAnalyze={hasContent}
          onAnalyze={analyze}
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="button"
          onClick={() => onSend({ serviceId, description, transcript, hasVideo: hasVideo || frames.length > 0, analysis })}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:brightness-105 active:scale-[0.98]"
        >
          <Send className="size-5" aria-hidden="true" />
          {hasContent ? `Envoyer l’alerte — ${service.label}` : `Envoyer sans détail — ${service.label}`}
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Toute fausse alerte est passible de poursuites.
        </p>
      </div>
    </div>
  )
}
