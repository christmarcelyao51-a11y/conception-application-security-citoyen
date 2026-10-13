'use client'

import { Mic, MicOff, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } }
type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

type VoiceInputProps = {
  transcript: string
  onTranscriptChange: (value: string) => void
}

export function VoiceInput({ transcript, onTranscriptChange }: VoiceInputProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const baseRef = useRef('')
  const [supported, setSupported] = useState<boolean | null>(null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null)
    return () => recognitionRef.current?.stop()
  }, [])

  function start() {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    setError(null)
    const recognition = new Ctor()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true
    baseRef.current = transcript ? `${transcript.trim()} ` : ''

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      if (finalText) {
        baseRef.current = `${baseRef.current}${finalText.trim()} `
        onTranscriptChange(baseRef.current.trim())
      }
      setInterim(interimText)
    }
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setError('Le micro n’est pas accessible. Vérifiez les autorisations du navigateur.')
      }
    }
    recognition.onend = () => {
      setListening(false)
      setInterim('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stop() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-4 py-8">
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={supported === false}
          aria-pressed={listening}
          aria-label={listening ? 'Arrêter la dictée vocale' : 'Démarrer la dictée vocale'}
          className={cn(
            'relative flex size-24 items-center justify-center rounded-full transition-colors disabled:opacity-40',
            listening ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
          )}
        >
          {listening ? (
            <span className="sos-ring absolute inset-0 rounded-full bg-primary" aria-hidden="true" />
          ) : null}
          {supported === false ? (
            <MicOff className="relative size-9" aria-hidden="true" />
          ) : (
            <Mic className="relative size-9" aria-hidden="true" />
          )}
        </button>

        <div className="flex h-6 items-end gap-1" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'w-1 rounded-full bg-primary/70 transition-all',
                listening ? 'animate-pulse' : 'opacity-30',
              )}
              style={{
                height: listening ? `${8 + ((i * 7) % 16)}px` : '4px',
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground text-pretty" aria-live="polite">
          {supported === false
            ? 'La saisie vocale n’est pas prise en charge par ce navigateur. Utilisez Chrome ou la saisie manuelle.'
            : listening
              ? 'Parlez maintenant, décrivez la situation…'
              : 'Appuyez sur le micro et décrivez ce qui se passe.'}
        </p>
        {error ? <p className="text-center text-sm text-primary">{error}</p> : null}
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Transcription</h3>
          {transcript ? (
            <button
              type="button"
              onClick={() => onTranscriptChange('')}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Effacer
            </button>
          ) : null}
        </div>
        <p className="min-h-12 text-sm leading-relaxed">
          {transcript || interim ? (
            <>
              {transcript} <span className="text-muted-foreground">{interim}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Votre message vocal apparaîtra ici.</span>
          )}
        </p>
      </div>
    </div>
  )
}
