'use client'

import { Camera, CircleStop, RefreshCw, Video, VideoOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type VideoCaptureProps = {
  onFramesChange: (frames: string[]) => void
  onRecordedChange: (hasVideo: boolean) => void
}

type CamState = 'idle' | 'starting' | 'live' | 'recording' | 'error'

const MAX_FRAMES = 3
const FRAME_EVERY_SECONDS = 3

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function VideoCapture({ onFramesChange, onRecordedChange }: VideoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const framesRef = useRef<string[]>([])

  const [state, setState] = useState<CamState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [elapsed, setElapsed] = useState(0)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [frameCount, setFrameCount] = useState(0)

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function startCamera(mode = facing) {
    setError(null)
    setState('starting')
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setState('live')
    } catch {
      setState('error')
      setError(
        'Impossible d’accéder à la caméra. Autorisez la caméra et le micro dans votre navigateur.',
      )
    }
  }

  function captureFrame() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const width = 640
    const height = Math.round((video.videoHeight / video.videoWidth) * width)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(video, 0, 0, width, height)
    const frame = canvas.toDataURL('image/jpeg', 0.7)
    framesRef.current = [...framesRef.current, frame].slice(-MAX_FRAMES)
    setFrameCount(framesRef.current.length)
    onFramesChange(framesRef.current)
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedUrl(null)
    try {
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
        setRecordedUrl(URL.createObjectURL(blob))
        onRecordedChange(true)
      }
      recorder.start(1000)
      recorderRef.current = recorder
      setElapsed(0)
      captureFrame()
      setState('recording')
    } catch {
      setError('L’enregistrement vidéo n’est pas pris en charge sur cet appareil.')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
    captureFrame()
    setState('live')
  }

  function switchCamera() {
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    if (state === 'live') startCamera(next)
  }

  useEffect(() => {
    if (state !== 'recording') return
    const id = setInterval(() => {
      setElapsed((s) => {
        const next = s + 1
        if (next % FRAME_EVERY_SECONDS === 0) captureFrame()
        return next
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useEffect(() => {
    return () => {
      recorderRef.current?.state === 'recording' && recorderRef.current.stop()
      stopStream()
    }
  }, [])

  const isActive = state === 'live' || state === 'recording'

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border bg-black sm:aspect-video">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            'h-full w-full object-cover',
            facing === 'user' && 'scale-x-[-1]',
            !isActive && 'hidden',
          )}
        />

        {!isActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
              {state === 'error' ? (
                <VideoOff className="size-6 text-primary" aria-hidden="true" />
              ) : (
                <Video className="size-6 text-foreground" aria-hidden="true" />
              )}
            </div>
            <p className="max-w-xs text-sm text-muted-foreground text-pretty">
              {error ??
                'Filmez la situation en temps réel. La vidéo est transmise au centre d’appel et analysée par l’IA.'}
            </p>
            <button
              type="button"
              onClick={() => startCamera()}
              disabled={state === 'starting'}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
            >
              <Camera className="size-4" aria-hidden="true" />
              {state === 'starting' ? 'Activation…' : 'Activer la caméra'}
            </button>
          </div>
        ) : null}

        {isActive ? (
          <>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide',
                  state === 'recording' ? 'bg-primary text-primary-foreground' : 'bg-white/15 text-white',
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    state === 'recording' ? 'animate-pulse bg-white' : 'bg-white/70',
                  )}
                  aria-hidden="true"
                />
                {state === 'recording' ? `EN DIRECT ${formatTime(elapsed)}` : 'APERÇU'}
              </span>
              <button
                type="button"
                onClick={switchCamera}
                disabled={state === 'recording'}
                className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-40"
                aria-label="Changer de caméra"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/70 to-transparent p-4">
              {state === 'recording' ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-primary"
                  aria-label="Arrêter l’enregistrement"
                >
                  <CircleStop className="size-7 text-white" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-white/10"
                  aria-label="Démarrer l’enregistrement en direct"
                >
                  <span className="size-10 rounded-full bg-primary" />
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {frameCount > 0
            ? `${frameCount} image${frameCount > 1 ? 's' : ''} prête${frameCount > 1 ? 's' : ''} pour l’analyse IA`
            : 'Aucune image capturée'}
        </span>
        {isActive && state !== 'recording' ? (
          <button
            type="button"
            onClick={captureFrame}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Capturer une image
          </button>
        ) : null}
      </div>

      {recordedUrl ? (
        <div className="rounded-xl border bg-card p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Dernier enregistrement</p>
          <video src={recordedUrl} controls playsInline className="w-full rounded-lg" />
        </div>
      ) : null}
    </div>
  )
}
