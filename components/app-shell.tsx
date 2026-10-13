'use client'

import { useEffect, useState } from 'react'
import { AlertComposer, type ComposedAlert } from '@/components/alert/alert-composer'
import { BottomNav, type Tab } from '@/components/bottom-nav'
import { HistoryScreen } from '@/components/screens/history-screen'
import { HomeScreen } from '@/components/screens/home-screen'
import { NearbyScreen } from '@/components/screens/nearby-screen'
import { ProfileScreen } from '@/components/screens/profile-screen'
import { TrackingScreen } from '@/components/screens/tracking-screen'
import { useGeolocation } from '@/hooks/use-geolocation'
import type { SentAlert } from '@/lib/alert'
import type { PublicAccount } from '@/lib/auth-demo'
import { getNearestStation } from '@/lib/geo'
import { createOperation, fetchOperationStatus, readOperations, updateOperationStatus, writeOperations } from '@/lib/operations'
import type { ServiceId } from '@/lib/services'

type View =
  | { kind: 'tabs' }
  | { kind: 'compose'; serviceId: ServiceId; mode: 'video' | 'voice' | 'text' }
  | { kind: 'tracking'; alertId: string }

type AppShellProps = {
  user: PublicAccount
  onLogout: () => void
}

export function AppShell({ user, onLogout }: AppShellProps) {
  const geo = useGeolocation()
  const [tab, setTab] = useState<Tab>('accueil')
  const [view, setView] = useState<View>({ kind: 'tabs' })
  const [alerts, setAlerts] = useState<SentAlert[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    setAvatarUrl(window.localStorage.getItem(`security-citoyen-avatar-${user.id}`))
  }, [user.id])

  useEffect(() => {
    let active = true
    const sync = async () => {
      const cached = readOperations()
      const synchronized = await Promise.all(cached.map(async (alert) => {
        if (alert.status === 'cloturee' || alert.status === 'annulee') return alert
        try {
          const status = await fetchOperationStatus(alert.id)
          return { ...alert, ...status }
        } catch {
          return alert
        }
      }))
      if (active) {
        setAlerts(synchronized)
        writeOperations(synchronized)
      }
    }
    void sync()
    const timer = window.setInterval(() => void sync(), 1500)
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'security-citoyen-operations-v1') sync()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function updateAvatar(url: string | null) {
    setAvatarUrl(url)
    try {
      const key = `security-citoyen-avatar-${user.id}`
      if (url) window.localStorage.setItem(key, url)
      else window.localStorage.removeItem(key)
    } catch {
      // Keep the photo for the current session even if local storage is unavailable.
    }
  }

  const activeAlert = alerts.find((a) => ['envoyee', 'en-route', 'sur-place'].includes(a.status)) ?? null

  function startAlert(serviceId: ServiceId, mode: 'video' | 'voice' | 'text' = 'video') {
    setView({ kind: 'compose', serviceId, mode })
  }

  function sendAlert(composed: ComposedAlert) {
    const serviceId = composed.analysis?.recommendedServices[0] && composed.serviceId === 'autre'
      ? composed.analysis.recommendedServices[0]
      : composed.serviceId
    const alert: SentAlert = {
      id: crypto.randomUUID(),
      serviceId,
      createdAt: Date.now(),
      description: composed.description,
      transcript: composed.transcript,
      hasVideo: composed.hasVideo,
      analysis: composed.analysis,
      userPosition: geo.position,
      station: getNearestStation(geo.position, serviceId),
      status: 'envoyee',
      statusUpdatedAt: Date.now(),
      reporter: { name: `${user.firstName} ${user.lastName}`, phone: user.phone },
    }
    setAlerts((prev) => {
      const next = [alert, ...prev]
      writeOperations(next)
      return next
    })
    void createOperation(alert).catch(() => {
      // Same-browser local storage remains as an offline demo fallback.
    })
    setView({ kind: 'tracking', alertId: alert.id })
  }

  function cancelAlert(id: string) {
    setAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, status: 'annulee' as const } : a))
      writeOperations(next)
      return next
    })
    void updateOperationStatus(id, 'annulee').catch(() => {
      // Same-browser local storage remains as an offline demo fallback.
    })
  }

  const trackingAlert = view.kind === 'tracking' ? alerts.find((a) => a.id === view.alertId) : undefined

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background shadow-2xl shadow-black/50 md:border-x">
      {view.kind === 'compose' ? (
        <AlertComposer
          key={`${view.serviceId}-${view.mode}`}
          initialService={view.serviceId}
          initialMode={view.mode}
          geo={geo}
          onBack={() => setView({ kind: 'tabs' })}
          onSend={sendAlert}
        />
      ) : trackingAlert ? (
        <TrackingScreen
          alert={trackingAlert}
          onBack={() => {
            setView({ kind: 'tabs' })
            setTab('accueil')
          }}
          onCancel={cancelAlert}
        />
      ) : (
        <>
          {tab === 'accueil' ? (
            <HomeScreen
              user={user}
              alertCount={alerts.length}
              geo={geo}
              activeAlert={activeAlert}
              onStartAlert={startAlert}
              onOpenTracking={() => activeAlert && setView({ kind: 'tracking', alertId: activeAlert.id })}
            />
          ) : null}
          {tab === 'carte' ? <NearbyScreen geo={geo} onStartAlert={(id) => startAlert(id)} /> : null}
          {tab === 'alertes' ? (
            <HistoryScreen alerts={alerts} onOpen={(id) => setView({ kind: 'tracking', alertId: id })} />
          ) : null}
          {tab === 'profil' ? (
            <ProfileScreen user={user} avatarUrl={avatarUrl} onAvatarChange={updateAvatar} onLogout={onLogout} />
          ) : null}
          <BottomNav tab={tab} onChange={setTab} />
        </>
      )}
    </div>
  )
}
