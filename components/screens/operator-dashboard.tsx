'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowRight, Building2, Car, Check, CheckCircle2, ClipboardList, Clock3,
  Crosshair, KeyRound, LogOut, LoaderCircle, MapPin, Navigation, Phone, Search, Shield, TriangleAlert, UserRound,
  type LucideIcon,
} from 'lucide-react'
import { LazyMap } from '@/components/map/lazy-map'
import { SERVICES, type EmergencyService, type ServiceId } from '@/lib/services'
import { formatDistance } from '@/lib/geo'
import { distanceKm } from '@/lib/geo'
import { backendFetch, fetchOperations, readOperations, updateOperationStatus, writeOperations } from '@/lib/operations'
import type { AlertStatus, SentAlert } from '@/lib/alert'

const OPERATOR_SERVICES = SERVICES
const sessionKey = 'security-citoyen-operator-session-v1'
const openStatuses: AlertStatus[] = ['envoyee', 'en-route', 'sur-place']

function urgency(alert: SentAlert) {
  return alert.analysis?.urgencyLevel ?? 'moderee'
}

function urgencyLabel(value: string) {
  return value === 'critique' ? 'Critique' : value === 'elevee' ? 'Élevée' : value === 'faible' ? 'Faible' : 'Modérée'
}

function urgencyRank(alert: SentAlert) {
  const ranks: Record<string, number> = { critique: 4, elevee: 3, moderee: 2, faible: 1 }
  return ranks[urgency(alert)] ?? 0
}

function elapsedLabel(createdAt: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60_000))
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h ${minutes % 60} min`
  return `il y a ${Math.floor(hours / 24)} j ${hours % 24} h`
}

function statusLabel(status: AlertStatus) {
  return status === 'envoyee' ? 'Nouvelle demande' : status === 'en-route' ? 'Secours en déplacement' : status === 'sur-place' ? 'Équipe sur place' : status === 'cloturee' ? 'Prise en charge terminée' : 'Demande annulée'
}

function ServiceMark({ service, size = 42 }: { service: EmergencyService; size?: number }) {
  const Icon = service.icon
  return <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.06]" style={{ width: size, height: size }}>
    {service.logo ? <Image src={service.logo} alt="" width={size - 8} height={size - 8} className="size-full object-contain p-1" /> : <Icon className="size-[18px] stroke-[1.7] text-slate-300" />}
  </div>
}

export function OperatorDashboard() {
  const [serviceId, setServiceId] = useState<ServiceId | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceId | null>(null)
  const [operatorName, setOperatorName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [operations, setOperations] = useState<SentAlert[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'actives' | 'toutes' | 'terminees'>('actives')
  const [query, setQuery] = useState('')
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null)
  const [statusUpdateError, setStatusUpdateError] = useState('')
  const refreshInFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (!window.sessionStorage.getItem(sessionKey)) return
    if (refreshInFlight.current) return
    refreshInFlight.current = true
    setIsRefreshing(true)
    try {
      const shared = await fetchOperations()
      setOperations(shared)
      writeOperations(shared)
      setBackendStatus('connected')
      setLastSyncAt(Date.now())
    } catch (error) {
      if (error instanceof Error && error.message === 'HTTP_401') {
        setServiceId(null)
        setOperatorName('')
        setBackendStatus('disconnected')
        try { window.sessionStorage.removeItem(sessionKey) } catch { /* Ignore storage failure. */ }
        return
      }
      setOperations(readOperations())
      setBackendStatus('disconnected')
    } finally {
      refreshInFlight.current = false
      setIsRefreshing(false)
    }
  }, [])
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const cached = JSON.parse(window.sessionStorage.getItem(sessionKey) ?? 'null') as { token?: string } | null
        if (!cached?.token) return
        const response = await backendFetch('/api/operator/session', { cache: 'no-store' }, cached.token)
        if (!response.ok) {
          window.sessionStorage.removeItem(sessionKey)
          return
        }
        setBackendStatus('connected')
        const session = await response.json() as { serviceId: ServiceId; name: string }
        setServiceId(session.serviceId)
        setSelectedServiceId(session.serviceId)
        setOperatorName(session.name)
        window.sessionStorage.setItem(sessionKey, JSON.stringify({ ...session, token: cached.token }))
        await refresh()
      } catch {
        setBackendStatus('disconnected')
        try { window.sessionStorage.removeItem(sessionKey) } catch { /* Ignore storage failure. */ }
      }
    }
    void restoreSession()
    const timer = window.setInterval(() => void refresh(), 1500)
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'security-citoyen-operations-v1') refresh()
    }
    window.addEventListener('storage', onStorage)
    const onOnline = () => {
      if (navigator.onLine) void refresh()
      else setBackendStatus('disconnected')
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOnline)
    if (!navigator.onLine) setBackendStatus('disconnected')
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOnline)
    }
  }, [refresh])

  const service = OPERATOR_SERVICES.find((item) => item.id === serviceId) ?? null
  const selectedService = OPERATOR_SERVICES.find((item) => item.id === selectedServiceId) ?? null
  const visibleOperations = useMemo(() => operations
    .filter((item) => item.serviceId === serviceId)
    .filter((item) => filter === 'actives' ? openStatuses.includes(item.status) : filter === 'terminees' ? ['cloturee', 'annulee'].includes(item.status) : true)
    .filter((item) => `${item.description} ${item.transcript} ${item.id}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(!openStatuses.includes(a.status)) - Number(!openStatuses.includes(b.status)) || urgencyRank(b) - urgencyRank(a) || Number(b.status === 'envoyee') - Number(a.status === 'envoyee') || a.createdAt - b.createdAt),
    [operations, serviceId, filter, query])
  const selected = visibleOperations.find((item) => item.id === selectedId) ?? visibleOperations[0] ?? null
  const activeCount = operations.filter((item) => item.serviceId === serviceId && openStatuses.includes(item.status)).length
  const criticalCount = operations.filter((item) => item.serviceId === serviceId && openStatuses.includes(item.status) && urgency(item) === 'critique').length

  async function login() {
    if (!selectedServiceId) {
      setLoginError('Sélectionnez votre service avant de vous connecter.')
      return
    }
    if (!identifier.trim() || !password) {
      setLoginError('Identifiants incorrects. Pour la démonstration, utilisez les identifiants affichés ci-dessous.')
      return
    }
    setIsLoggingIn(true)
    try {
      const response = await backendFetch('/api/operator/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: selectedServiceId, identifier: identifier.trim(), password }),
      })
      if (!response.ok) {
        setLoginError('Identifiants incorrects ou service non autorisé.')
        return
      }
      const session = await response.json() as { serviceId: ServiceId; name: string; token: string }
      setOperatorName(session.name)
      setServiceId(session.serviceId)
      setBackendStatus('connected')
      setLastSyncAt(Date.now())
      setLoginError('')
      try { window.sessionStorage.setItem(sessionKey, JSON.stringify(session)) } catch { /* Server cookie remains active. */ }
      setPassword('')
      await refresh()
    } catch {
      setLoginError('Erreur de connexion. Veuillez réessayez')
    } finally {
      setIsLoggingIn(false)
    }
  }

  function logout() {
    const cached = JSON.parse(window.sessionStorage.getItem(sessionKey) ?? 'null') as { token?: string } | null
    setServiceId(null)
    setOperatorName('')
    setSelectedServiceId(null)
    setIdentifier('')
    setPassword('')
    try { window.sessionStorage.removeItem(sessionKey) } catch { /* Ignore storage failure. */ }
    void backendFetch('/api/operator/session', { method: 'DELETE' }, cached?.token).catch(() => {})
  }

  async function updateStatus(alert: SentAlert, status: AlertStatus) {
    if (updatingAlertId) return
    setUpdatingAlertId(alert.id)
    setStatusUpdateError('')
    setSelectedId(alert.id)
    try {
      const saved = await updateOperationStatus(alert.id, status, operatorName)
      const updated = operations.map((item) => item.id === alert.id
        ? { ...item, ...saved, status, statusUpdatedAt: saved.statusUpdatedAt ?? Date.now(), ...(status === 'en-route' ? { assignedTo: saved.assignedTo ?? operatorName } : {}) }
        : item)
      setOperations(updated)
      writeOperations(updated)
    } catch {
      setStatusUpdateError('Le serveur n’a pas confirmé ce changement. Le statut de la demande reste inchangé. Vérifiez la connexion puis réessayez.')
    } finally {
      setUpdatingAlertId(null)
    }
  }

  if (!service) return <main className="operator-page min-h-dvh bg-[#08111d] text-white lg:grid lg:grid-cols-[minmax(360px,0.92fr)_minmax(600px,1.08fr)]">
    <section className="operator-photo-panel relative isolate flex min-h-[340px] flex-col justify-between overflow-hidden px-6 py-7 sm:min-h-[390px] sm:px-10 sm:py-9 lg:min-h-dvh lg:px-12 lg:py-10 xl:px-16">
      <Image src="/images/operator-portrait.jpg" alt="Opérateur de centre d’appels souriant et équipé d’un casque" fill priority sizes="(max-width: 1024px) 100vw, 46vw" className="-z-20 object-cover object-[48%_42%]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#06101b]/75 via-[#06101b]/30 to-[#06101b]/95 lg:bg-gradient-to-r lg:from-[#06101b]/25 lg:via-[#06101b]/50 lg:to-[#06101b]/90" />
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-white p-1"><Image src="/images/security-citoyen-logo.png" alt="" width={48} height={48} className="size-full object-contain" /></span>
        <span><span className="block text-sm font-black tracking-[0.12em]">SECURITY CITOYEN</span><span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">Coordination nationale</span></span>
      </div>
      <div className="operator-login-enter max-w-xl pb-2 lg:pb-8">
        <span className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-black/20 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur"><span className="size-1.5 rounded-full bg-emerald-300" />PORTAIL OPÉRATEUR</span>
        <h1 className="mt-5 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">Chaque alerte mérite une réponse coordonnée.</h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base">Un espace dédié aux équipes qui reçoivent, priorisent et suivent les demandes de secours à travers le pays.</p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/85"><span>Suivi des interventions</span><span>Accès par service</span></div>
      </div>
      <p className="text-[10px] text-white/55">Plateforme de coordination des secours</p>
    </section>

    <section className="flex items-center justify-center px-4 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="operator-login-panel operator-login-enter w-full max-w-2xl rounded-2xl border border-white/[0.09] bg-[#101927] p-5 shadow-2xl shadow-black/30 sm:p-8 xl:p-10">
        <div className="flex items-center justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">Portail professionnel</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Connexion opérateur</h2></div><span className="hidden size-12 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200 sm:flex"><Shield className="size-5" /></span></div>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Connectez-vous à l’espace de votre service. Les demandes et informations d’intervention restent réservées aux opérateurs habilités.</p>

        <div className="mt-7 flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-emerald-300 text-xs font-bold text-[#062016]">1</span><h3 className="text-sm font-semibold text-slate-100">Sélectionnez votre service</h3><span className="h-px flex-1 bg-white/[0.08]" /></div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {OPERATOR_SERVICES.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedServiceId(item.id); setLoginError('') }} aria-pressed={selectedServiceId === item.id} className={`group flex min-h-[76px] items-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${selectedServiceId === item.id ? 'border-emerald-300/50 bg-emerald-300/[0.08]' : 'border-white/[0.08] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]'}`}>
            <ServiceMark service={item} size={36} />
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-100">{item.label}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{item.description}</span></span>
            <span className={`size-2 shrink-0 rounded-full ${selectedServiceId === item.id ? 'bg-emerald-300' : 'bg-slate-700'}`} />
          </button>)}
        </div>

        {selectedService ? <div key={selectedService.id} className="operator-selected-service mt-3 flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#09111c]/70 px-3 py-2.5" aria-live="polite">
          <ServiceMark service={selectedService} size={42} />
          <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Service sélectionné</p><p className="mt-0.5 truncate text-sm font-semibold text-white">{selectedService.label}</p></div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1.5 text-[10px] font-medium text-emerald-200"><Shield className="size-3" />Accès sécurisé</span>
        </div> : null}

        <div className="mt-7 flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">2</span><h3 className="text-sm font-semibold text-slate-100">Vos identifiants professionnels</h3><span className="h-px flex-1 bg-white/[0.08]" /></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-400" htmlFor="operator-identifier">Identifiant
            <span className="relative mt-2 block"><UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input id="operator-identifier" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Votre identifiant" className="h-12 w-full rounded-xl border border-white/[0.09] bg-[#09111c] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-300/[0.07]" /></span>
          </label>
          <label className="block text-xs font-medium text-slate-400" htmlFor="operator-password">Mot de passe
            <span className="relative mt-2 block"><KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input id="operator-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void login() }} placeholder="Votre mot de passe" className="h-12 w-full rounded-xl border border-white/[0.09] bg-[#09111c] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-300/[0.07]" /></span>
          </label>
        </div>
        {loginError ? <p role="alert" className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3.5 py-3 text-xs text-red-200">{loginError}</p> : null}
        <button type="button" disabled={isLoggingIn} onClick={() => void login()} className="operator-login-submit mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-bold text-[#062016] shadow-lg shadow-emerald-950/20 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-70">{isLoggingIn ? <LoaderCircle className="size-4 animate-spin" /> : <Shield className="size-4" />}{isLoggingIn ? 'Vérification en cours…' : 'Accéder au tableau de bord'}<ArrowRight className="size-4" /></button>
        <p className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] px-3.5 py-3 text-[11px] leading-5 text-amber-100/65"><strong className="text-amber-100/85">Mode démonstration :</strong> <code>operateur</code> / <code>demo2026</code>. Le déploiement national nécessite un annuaire d’opérateurs et une authentification gérée par l’organisation.</p>
      </div>
    </section>
  </main>

  return <main className="operator-dashboard operator-dashboard-enter relative isolate min-h-dvh text-white">
    <div className="operator-service-watermark" aria-hidden="true">
      {service.logo ? <Image src={service.logo} alt="" fill sizes="(max-width: 1024px) 60vw, 40vw" className="operator-watermark-image object-contain" /> : <service.icon className="operator-watermark-image size-64 stroke-[0.7] text-white" />}
      <span>{service.label}</span>
    </div>
    <header className="sticky top-0 z-[600] flex h-[76px] items-center justify-between border-b border-white/[0.08] bg-[#0b1320]/95 px-4 shadow-lg shadow-black/10 backdrop-blur-xl md:px-8">
      <div className="flex min-w-0 items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1"><Image src="/images/security-citoyen-logo.png" alt="" width={48} height={48} className="size-full object-contain" /></span><span className="hidden h-8 w-px bg-white/10 sm:block" /><ServiceMark service={service} size={40} /><div className="min-w-0"><p className="truncate text-sm font-bold tracking-tight">Centre de coordination</p><p className="truncate text-[11px] text-slate-500">{service.label} <span className="px-1 text-slate-700">/</span> Côte d’Ivoire</p></div></div>
      <div className="flex items-center gap-3 md:gap-5"><div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[11px] text-slate-400"><span className={`size-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)]' : backendStatus === 'checking' ? 'animate-pulse bg-sky-300' : 'bg-amber-400'}`} />{backendStatus === 'connected' ? 'API connectée' : backendStatus === 'checking' ? 'Connexion…' : 'API hors ligne'}</div><div className="hidden text-right sm:block"><p className="text-xs font-medium text-slate-200">{operatorName}</p><p className="mt-0.5 text-[10px] text-slate-500">Session opérateur</p></div><button onClick={logout} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white"><LogOut className="size-4" /><span className="hidden sm:block">Déconnexion</span></button></div>
    </header>

    <div className="operator-dashboard-content relative z-10 mx-auto max-w-[1760px] p-4 md:p-6 xl:p-8">
      <div className="operator-login-enter mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300"><span className={`size-1.5 rounded-full ${backendStatus === 'connected' ? 'animate-pulse bg-emerald-300' : backendStatus === 'checking' ? 'animate-pulse bg-sky-300' : 'bg-amber-300'}`} />Supervision opérationnelle</div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Opérations de secours</h1><p className="mt-1 text-xs text-slate-500">Vue de service · {service.label} · Côte d’Ivoire</p></div><div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-[#101927]/90 px-3 py-2 text-[11px] text-slate-400"><Activity className={`size-3.5 ${backendStatus === 'connected' ? 'text-emerald-300' : backendStatus === 'checking' ? 'animate-pulse text-sky-300' : 'text-amber-300'}`} /><span>{lastSyncAt ? `Dernière synchro à ${new Date(lastSyncAt).toLocaleTimeString('fr-FR')}` : backendStatus === 'checking' ? 'Synchronisation en cours…' : 'Aucune synchronisation'}</span><span className="text-slate-700">·</span><span>Auto · 1,5 s</span>{backendStatus === 'disconnected' ? <button type="button" onClick={() => void refresh()} disabled={isRefreshing} className="ml-1 rounded-lg border border-amber-300/20 px-2.5 py-1.5 font-semibold text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-60">{isRefreshing ? 'Connexion…' : 'Réessayer'}</button> : null}</div></div>
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon={ClipboardList} label="Demandes actives" value={String(activeCount)} tone="blue" delay={0} />
        <Metric icon={TriangleAlert} label="Priorité critique" value={String(criticalCount)} tone="red" delay={70} />
        <Metric icon={Navigation} label="En déplacement" value={String(operations.filter((a) => a.serviceId === serviceId && a.status === 'en-route').length)} tone="amber" delay={140} />
        <Metric icon={CheckCircle2} label="Clôturées aujourd’hui" value={String(operations.filter((a) => a.serviceId === serviceId && a.status === 'cloturee' && new Date(a.createdAt).toDateString() === new Date().toDateString()).length)} tone="green" delay={210} />
      </div>

      <div className="grid min-h-[calc(100dvh-270px)] gap-4 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(390px,460px)_minmax(0,1fr)]">
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101927]">
          <div className="border-b border-white/[0.07] p-4">
            <div className="flex items-center justify-between"><h2 className="font-semibold">File des demandes</h2><span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs text-slate-300">{visibleOperations.length}</span></div>
            <div className="relative mt-3"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une demande" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0a111d] pl-9 pr-3 text-xs outline-none focus:border-emerald-400/40" /></div>
            <div className="mt-3 flex gap-1 rounded-xl bg-[#0a111d] p-1">{([['actives', 'Actives'], ['toutes', 'Toutes'], ['terminees', 'Terminées']] as const).map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={`flex-1 rounded-lg py-2 text-[11px] font-medium transition ${filter === id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{label}</button>)}</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {visibleOperations.length ? visibleOperations.map((alert, index) => <button key={alert.id} onClick={() => setSelectedId(alert.id)} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }} className={`operator-alert-row mb-2 w-full rounded-xl border p-3 text-left transition ${selected?.id === alert.id ? 'border-emerald-400/40 bg-emerald-400/[0.06]' : 'border-transparent bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.045]'}`}>
              <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><TriangleAlert aria-hidden="true" className={`size-4 shrink-0 stroke-[1.8] ${urgency(alert) === 'critique' ? 'text-red-300' : urgency(alert) === 'elevee' ? 'text-orange-300' : 'text-sky-300'}`} /><span className="truncate text-sm font-semibold">{alert.description || alert.transcript || 'Demande de secours'}</span></div><span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide ${urgency(alert) === 'critique' ? 'bg-red-400/10 text-red-300' : urgency(alert) === 'elevee' ? 'bg-orange-400/10 text-orange-300' : 'bg-sky-400/10 text-sky-300'}`}>{urgencyLabel(urgency(alert))}</span></div>
              <div className="mt-3 flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-1.5 text-slate-400"><Clock3 className="size-3.5 shrink-0 text-slate-500" /><span className="truncate">{elapsedLabel(alert.createdAt)} · {statusLabel(alert.status)}</span></span><span className="shrink-0 text-slate-500">{formatDistance(distanceKm(alert.userPosition, alert.station.position))}</span></div>
            </button>) : <div className="flex h-full min-h-60 flex-col items-center justify-center px-8 text-center"><div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.05] text-slate-500"><Check className="size-5" /></div><p className="mt-3 text-sm font-medium text-slate-300">Aucune demande dans cette file</p><p className="mt-1 text-xs leading-5 text-slate-500">Les nouvelles alertes destinées à votre service apparaîtront ici automatiquement.</p></div>}
          </div>
        </section>

        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101927]">
          {selected ? <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] p-4 md:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">Détail de la demande</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${urgency(selected) === 'critique' ? 'bg-red-400/10 text-red-300' : 'bg-amber-300/10 text-amber-200'}`}>{urgencyLabel(urgency(selected))}</span></div><p className="mt-1 text-xs text-slate-500">Référence {selected.id.slice(0, 8).toUpperCase()} · reçue à {new Date(selected.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p></div><span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-2 text-xs text-slate-300"><span className={`size-2 rounded-full ${selected.status === 'cloturee' ? 'bg-emerald-400' : selected.status === 'annulee' ? 'bg-slate-500' : 'animate-pulse bg-emerald-400'}`} />{statusLabel(selected.status)}</span></div>
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500"><span className="flex items-center gap-2"><MapPin className="size-3.5 text-red-300" />Carte de l’intervention</span><span className="flex items-center gap-1.5 normal-case tracking-normal text-slate-400"><span className="size-1.5 rounded-full bg-red-400" />Signalement citoyen</span></div>
            <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_290px]">
              <div className="relative min-h-[340px] border-b border-white/[0.06] lg:min-h-0 lg:border-b-0 lg:border-r">
                <LazyMap
                  user={selected.userPosition}
                  route={[selected.station.position, selected.userPosition]}
                  unit={{ position: selected.station.position, label: selected.station.name }}
                  movingUnit={selected.status === 'en-route' || selected.status === 'sur-place'
                    ? { status: selected.status, statusUpdatedAt: selected.statusUpdatedAt, label: service.unitName }
                    : undefined}
                  className="absolute inset-0"
                />
                <div className="absolute left-3 top-3 z-[500] rounded-lg border border-white/10 bg-[#0c1420]/90 px-2.5 py-2 text-[10px] text-slate-200 shadow-lg backdrop-blur"><span className="flex items-center gap-1.5"><Crosshair className="size-3.5 text-red-300" />Signalement</span></div>
                <div role="group" aria-label="Légende de la carte" className="absolute right-3 top-3 z-[500] w-44 rounded-xl border border-white/10 bg-[#0c1420]/95 p-3 text-[10px] text-slate-300 shadow-xl backdrop-blur-md sm:w-48">
                  <p className="mb-2 font-bold uppercase tracking-[0.14em] text-slate-400">Légende</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><span className="size-2.5 rounded-full border-2 border-white bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,.18)]" /><span>Lieu du signalement</span></div>
                    <div className="flex items-center gap-2"><span className="flex size-3 items-center justify-center rounded-[4px] bg-emerald-600 text-[8px] font-bold text-white">+</span><span>Base de départ</span></div>
                    {selected.status === 'en-route' || selected.status === 'sur-place' ? <div className="flex items-center gap-2"><Car className="size-3.5 text-sky-300" /><span>{selected.status === 'en-route' ? 'Véhicule animé (simulation)' : 'Équipe déclarée sur place'}</span></div> : null}
                    <div className="flex items-center gap-2"><span className="w-4 border-t-2 border-dashed border-sky-400" /><span>Liaison indicative</span></div>
                  </div>
                  <p className="mt-2 border-t border-white/[0.07] pt-2 text-[9px] leading-4 text-slate-500">Ligne directe sans itinéraire routier. Position animée à titre illustratif, sans GPS embarqué.</p>
                </div>
                <div className="absolute bottom-3 left-3 z-[500] flex items-center gap-2 rounded-lg border border-white/10 bg-[#0c1420]/90 px-3 py-2 text-[11px] text-slate-300 shadow-lg backdrop-blur"><MapPin className="size-3.5 text-red-300" />{selected.userPosition.lat.toFixed(5)}, {selected.userPosition.lng.toFixed(5)}</div>
              </div>
              <div className="flex flex-col gap-4 p-4">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Informations</p><p className="mt-2 text-sm leading-6 text-slate-200">{selected.description || selected.transcript || 'Aucune description fournie.'}</p>{selected.transcript && selected.description !== selected.transcript ? <p className="mt-2 rounded-lg bg-white/[0.035] p-3 text-xs leading-5 text-slate-400">« {selected.transcript} »</p> : null}</div>
                {selected.reporter ? <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500"><Phone className="size-3.5 stroke-[1.8]" />Citoyen à rappeler</p><p className="mt-2 text-xs font-semibold text-slate-200">{selected.reporter.name}</p><a href={`tel:${selected.reporter.phone}`} className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-emerald-300 hover:text-emerald-200">{selected.reporter.phone}</a></div> : null}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500"><Building2 className="size-3.5 stroke-[1.8]" />Point de départ de l’équipe</p><p className="mt-2 text-xs font-medium text-slate-200">{selected.station.name}</p><p className="mt-1 text-xs text-slate-500">À vol d’oiseau : {formatDistance(distanceKm(selected.userPosition, selected.station.position))}</p></div>
                {selected.assignedTo ? <div className="rounded-lg bg-emerald-400/[0.06] px-3 py-2 text-[11px] text-emerald-200">Pris en charge par <strong>{selected.assignedTo}</strong></div> : null}
                {statusUpdateError && selected.id === selectedId ? <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2.5 text-xs leading-5 text-red-200">{statusUpdateError}</p> : null}
                <div className="mt-auto space-y-2">
                  {selected.status === 'envoyee' ? <button disabled={updatingAlertId === selected.id} onClick={() => void updateStatus(selected, 'en-route')} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-[#062016] transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">{updatingAlertId === selected.id ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{updatingAlertId === selected.id ? 'Enregistrement…' : 'Prendre en charge et envoyer une équipe'}</button> : null}
                  {selected.status === 'en-route' ? <button disabled={updatingAlertId === selected.id} onClick={() => void updateStatus(selected, 'sur-place')} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-bold text-[#061b26] transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60">{updatingAlertId === selected.id ? <LoaderCircle className="size-4 animate-spin" /> : <MapPin className="size-4" />}{updatingAlertId === selected.id ? 'Enregistrement…' : 'Confirmer l’arrivée sur place'}</button> : null}
                  {selected.status === 'sur-place' ? <button disabled={updatingAlertId === selected.id} onClick={() => void updateStatus(selected, 'cloturee')} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-[#062016] transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">{updatingAlertId === selected.id ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{updatingAlertId === selected.id ? 'Enregistrement…' : 'Clôturer la prise en charge'}</button> : null}
                  {selected.status === 'cloturee' ? <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-3 text-xs font-semibold text-emerald-300"><CheckCircle2 className="size-4" />Intervention clôturée</div> : null}
                  {selected.status === 'annulee' ? <div className="rounded-xl bg-white/[0.05] px-4 py-3 text-center text-xs text-slate-400">Cette demande a été annulée par le citoyen.</div> : null}
                </div>
              </div>
            </div>
          </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><span className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-slate-400"><ClipboardList aria-hidden="true" className="size-6 stroke-[1.6]" /></span><h2 className="mt-4 text-lg font-semibold">En attente des demandes</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Lorsqu’un citoyen enverra une alerte à {service.label}, elle sera affichée ici avec sa position sur la carte.</p></div>}
        </section>
      </div>
      <p className="mt-4 text-center text-[11px] leading-5 text-slate-600">Mode prototype sur ce navigateur · les changements de statut sont visibles par l’application citoyenne ouverte dans le même navigateur.</p>
    </div>
  </main>
}

function Metric({ icon: Icon, label, value, tone, delay }: { icon: LucideIcon; label: string; value: string; tone: 'blue' | 'red' | 'amber' | 'green'; delay: number }) {
  const colors = { blue: 'text-sky-300 bg-sky-300/10', red: 'text-red-300 bg-red-300/10', amber: 'text-amber-200 bg-amber-200/10', green: 'text-emerald-300 bg-emerald-300/10' }
  return <div style={{ animationDelay: `${delay}ms` }} className="operator-metric flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#101927]/90 p-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${colors[tone]}`}><Icon aria-hidden="true" className="size-[18px] stroke-[1.7]" /></span><span className="min-w-0"><span className="block text-2xl font-bold leading-none tabular-nums">{value}</span><span className="mt-1.5 block truncate text-[11px] text-slate-500">{label}</span></span></div>
}
