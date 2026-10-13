'use client'

import { AlertTriangle, BrainCircuit, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import type { Analysis } from '@/lib/analysis'
import { RISK_LABELS, URGENCY_LABELS } from '@/lib/alert'
import { getService } from '@/lib/services'
import { cn } from '@/lib/utils'

type AiAnalysisCardProps = {
  analysis: Analysis | null
  loading: boolean
  error: string | null
  canAnalyze: boolean
  onAnalyze: () => void
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'success' | 'warning' }) {
  const color = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning' }[tone]
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{Math.round(value)}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary" role="presentation">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function AiAnalysisCard({ analysis, loading, error, canAnalyze, onAnalyze }: AiAnalysisCardProps) {
  return (
    <section aria-labelledby="ai-title" className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
            <BrainCircuit className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="ai-title" className="text-sm font-semibold">
              Agent IA d’analyse
            </h2>
            <p className="text-xs text-muted-foreground">Voix, vidéo et texte · détection des fausses alertes</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze || loading}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {analysis ? 'Relancer' : 'Analyser'}
        </button>
      </div>

      <div aria-live="polite">
        {!analysis && !loading && !error ? (
          <p className="mt-3 text-sm text-muted-foreground text-pretty">
            {canAnalyze
              ? 'Lancez l’analyse pour prioriser votre alerte. Facultatif : vous pouvez envoyer directement.'
              : 'Ajoutez une vidéo, un message vocal ou une description pour activer l’analyse.'}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Analyse de la situation en cours…</p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-primary">{error}</p> : null}

        {analysis && !loading ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-bold',
                  analysis.urgencyLevel === 'critique' || analysis.urgencyLevel === 'elevee'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-warning text-background',
                )}
              >
                Urgence {URGENCY_LABELS[analysis.urgencyLevel]}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                  analysis.falseAlertRisk === 'faible'
                    ? 'bg-success/15 text-success'
                    : analysis.falseAlertRisk === 'moyen'
                      ? 'bg-warning/15 text-warning'
                      : 'bg-primary/15 text-primary',
                )}
              >
                {analysis.falseAlertRisk === 'faible' ? (
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                )}
                Risque de fausse alerte : {RISK_LABELS[analysis.falseAlertRisk]}
              </span>
            </div>

            <p className="text-sm leading-relaxed">{analysis.summary}</p>

            <div className="flex flex-col gap-3">
              <ScoreBar label="Niveau d’urgence" value={analysis.urgencyScore} tone="primary" />
              <ScoreBar
                label="Crédibilité du signalement"
                value={analysis.credibilityScore}
                tone={analysis.credibilityScore >= 60 ? 'success' : 'warning'}
              />
            </div>

            {analysis.recommendedServices.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Services recommandés
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendedServices.map((id) => {
                    const s = getService(id)
                    const Icon = s.icon
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium">
                        <Icon className="size-3.5" aria-hidden="true" />
                        {s.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {analysis.detectedSignals.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Indices détectés
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {analysis.detectedSignals.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {analysis.suspiciousIndicators.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Points à vérifier
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {analysis.suspiciousIndicators.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {analysis.citizenAdvice.length > 0 ? (
              <div className="rounded-xl bg-secondary p-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  En attendant les secours
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {analysis.citizenAdvice.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
