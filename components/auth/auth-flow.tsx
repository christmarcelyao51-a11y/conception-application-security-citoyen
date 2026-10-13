'use client'

import { ArrowRight, Check, KeyRound, LoaderCircle, MessageSquareText, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { AuthStep, PrimaryButton, TextField } from '@/components/auth/auth-step'
import { CodeInput } from '@/components/auth/code-input'
import { PhoneField } from '@/components/auth/phone-field'
import { PinPad } from '@/components/auth/pin-pad'
import {
  type Account,
  type RegistrationDraft,
  formatPhone,
  generateOtp,
  hashPin,
  normalizePhone,
  pinWeakness,
} from '@/lib/auth-demo'

type Step =
  | 'welcome'
  | 'register-info'
  | 'register-otp'
  | 'register-pin'
  | 'register-pin-confirm'
  | 'register-done'
  | 'login-phone'
  | 'login-pin'

type AuthFlowProps = {
  accounts: Account[]
  onRegister: (account: Account) => void
  onLogin: (account: Account) => void
}

const EMPTY_DRAFT: RegistrationDraft = {
  countryCode: '+225',
  phone: '',
  firstName: '',
  lastName: '',
  city: '',
  birthDate: '',
}

const RESEND_SECONDS = 30
const MAX_PIN_ATTEMPTS = 3

function useCountdown(seconds: number, key: unknown) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    setLeft(seconds)
    const id = window.setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => window.clearInterval(id)
  }, [seconds, key])
  return left
}

function SmsPreview({ phone, code }: { phone: string; code: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-success/30 bg-success/10 p-4" role="status">
      <MessageSquareText className="size-5 shrink-0 text-success" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-semibold">SMS simulé envoyé au {formatPhone(phone)}</p>
        <p className="mt-0.5 text-muted-foreground">
          Votre code SECURITY CITOYEN : <span className="font-mono font-bold tracking-widest text-foreground">{code}</span>
        </p>
      </div>
    </div>
  )
}

export function AuthFlow({ accounts, onRegister, onLogin }: AuthFlowProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [draft, setDraft] = useState<RegistrationDraft>(EMPTY_DRAFT)
  const [infoError, setInfoError] = useState<string | null>(null)

  const [otp, setOtp] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpNonce, setOtpNonce] = useState(0)
  const [verifying, setVerifying] = useState(false)

  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)

  const [loginCountry, setLoginCountry] = useState('+225')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginAccount, setLoginAccount] = useState<Account | null>(null)
  const [loginPin, setLoginPin] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [createdAccount, setCreatedAccount] = useState<Account | null>(null)

  const resendLeft = useCountdown(RESEND_SECONDS, otpNonce)
  const fullPhone = normalizePhone(draft.countryCode, draft.phone)

  function update<K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function sendOtp() {
    setOtp(generateOtp())
    setOtpInput('')
    setOtpError(null)
    setOtpNonce((n) => n + 1)
  }

  function submitInfo(e: React.FormEvent) {
    e.preventDefault()
    const digits = draft.phone.replace(/\D/g, '')
    if (digits.length < 8) return setInfoError('Numéro de téléphone invalide.')
    if (!draft.firstName.trim() || !draft.lastName.trim()) return setInfoError('Nom et prénom requis.')
    if (accounts.some((a) => a.phone === fullPhone)) return setInfoError('Ce numéro possède déjà un compte. Connectez-vous.')
    setInfoError(null)
    sendOtp()
    setStep('register-otp')
  }

  function verifyOtp(code: string) {
    setVerifying(true)
    window.setTimeout(() => {
      setVerifying(false)
      if (code === otp) {
        setOtpError(null)
        setStep('register-pin')
      } else {
        setOtpError('Code incorrect. Vérifiez le SMS reçu.')
        setOtpInput('')
      }
    }, 600)
  }

  function choosePin(value: string) {
    const weak = pinWeakness(value)
    if (weak) {
      setPinError(weak)
      window.setTimeout(() => setPin(''), 350)
      return
    }
    setPinError(null)
    window.setTimeout(() => setStep('register-pin-confirm'), 200)
  }

  async function confirmPin(value: string) {
    if (value !== pin) {
      setPinError('Les codes ne correspondent pas.')
      window.setTimeout(() => setPinConfirm(''), 350)
      return
    }
    const id = crypto.randomUUID()
    const account: Account = {
      id,
      phone: fullPhone,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      city: draft.city.trim(),
      birthDate: draft.birthDate,
      pinHash: await hashPin(value, id),
      createdAt: Date.now(),
    }
    onRegister(account)
    setCreatedAccount(account)
    setStep('register-done')
  }

  function submitLoginPhone(e: React.FormEvent) {
    e.preventDefault()
    const target = normalizePhone(loginCountry, loginPhone)
    const found = accounts.find((a) => a.phone === target)
    if (!found) return setLoginError('Aucun compte trouvé pour ce numéro.')
    setLoginError(null)
    setLoginAccount(found)
    setLoginPin('')
    setAttempts(0)
    setStep('login-pin')
  }

  async function checkLoginPin(value: string) {
    if (!loginAccount) return
    const hash = await hashPin(value, loginAccount.id)
    if (hash === loginAccount.pinHash) {
      onLogin(loginAccount)
      return
    }
    const next = attempts + 1
    setAttempts(next)
    setPinError(
      next >= MAX_PIN_ATTEMPTS
        ? 'Trop de tentatives. Réessayez plus tard.'
        : `Code incorrect. ${MAX_PIN_ATTEMPTS - next} tentative(s) restante(s).`,
    )
    window.setTimeout(() => setLoginPin(''), 350)
  }

  function goto(next: Step) {
    setPinError(null)
    setStep(next)
  }

  if (step === 'welcome') {
    return (
      <div className="relative flex min-h-dvh flex-col">
        <div className="absolute inset-0">
          <Image src="/images/welcome-hero.png" alt="" fill priority className="object-cover" sizes="448px" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        </div>

        <div className="relative flex flex-1 flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-xl shadow-black/20 ring-1 ring-white/30">
            <Image
              src="/images/security-citoyen-logo.png"
              alt="Security Citoyen ivoirien"
              width={120}
              height={120}
              priority
              className="size-full object-contain"
            />
          </div>

          <div className="mt-auto flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                Secours disponibles 24h/24
              </span>
              <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance">
                Une alerte. Les secours arrivent.
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground text-pretty">
                Police, gendarmerie, SAMU, sapeurs-pompiers : alertez en un geste, filmez la situation et suivez
                l’intervention en direct.
              </p>
            </div>

            <ul className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { k: 'Vidéo', v: 'en direct' },
                { k: 'IA', v: 'anti-fraude' },
                { k: 'GPS', v: 'temps réel' },
              ].map((f) => (
                <li key={f.k} className="rounded-xl border bg-card/60 px-2 py-3 backdrop-blur">
                  <span className="block text-sm font-bold">{f.k}</span>
                  <span className="text-muted-foreground">{f.v}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3">
              <PrimaryButton onClick={() => goto('register-info')}>
                Créer mon compte
                <ArrowRight className="size-5" aria-hidden="true" />
              </PrimaryButton>
              <button
                type="button"
                onClick={() => goto('login-phone')}
                className="h-14 w-full rounded-2xl border bg-card/60 text-base font-semibold backdrop-blur transition-colors hover:bg-card"
              >
                J’ai déjà un compte
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'register-info') {
    return (
      <AuthStep
        title="Créer votre compte"
        subtitle="Ces informations permettent aux secours de vous identifier rapidement."
        step={{ current: 1, total: 3 }}
        onBack={() => goto('welcome')}
        footer={
          <>
            {infoError ? (
              <p role="alert" className="text-sm text-destructive">
                {infoError}
              </p>
            ) : null}
            <PrimaryButton type="submit" form="register-form">
              Recevoir le code par SMS
            </PrimaryButton>
            <p className="text-center text-xs text-muted-foreground text-pretty">
              En continuant, vous acceptez les conditions d’utilisation et l’usage responsable des alertes.
            </p>
          </>
        }
      >
        <form id="register-form" onSubmit={submitInfo} className="flex flex-col gap-4">
          <PhoneField
            countryCode={draft.countryCode}
            phone={draft.phone}
            onCountryCodeChange={(v) => update('countryCode', v)}
            onPhoneChange={(v) => update('phone', v)}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="firstName"
              label="Prénom"
              autoComplete="given-name"
              placeholder="Aya"
              value={draft.firstName}
              onChange={(e) => update('firstName', e.target.value)}
            />
            <TextField
              id="lastName"
              label="Nom"
              autoComplete="family-name"
              placeholder="Kouassi"
              value={draft.lastName}
              onChange={(e) => update('lastName', e.target.value)}
            />
          </div>
          <TextField
            id="city"
            label="Ville / Commune"
            autoComplete="address-level2"
            placeholder="Cocody, Abidjan"
            value={draft.city}
            onChange={(e) => update('city', e.target.value)}
          />
          <TextField
            id="birthDate"
            label="Date de naissance"
            type="date"
            value={draft.birthDate}
            onChange={(e) => update('birthDate', e.target.value)}
          />
        </form>
      </AuthStep>
    )
  }

  if (step === 'register-otp') {
    return (
      <AuthStep
        title="Vérifiez votre numéro"
        subtitle={
          <>
            Saisissez le code à 6 chiffres envoyé au{' '}
            <span className="font-mono font-medium text-foreground">{formatPhone(fullPhone)}</span>.
          </>
        }
        step={{ current: 2, total: 3 }}
        onBack={() => goto('register-info')}
        footer={
          <PrimaryButton disabled={otpInput.length !== 6 || verifying} onClick={() => verifyOtp(otpInput)}>
            {verifying ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
            {verifying ? 'Vérification…' : 'Valider le code'}
          </PrimaryButton>
        }
      >
        <SmsPreview phone={fullPhone} code={otp} />
        <CodeInput
          label="Code de vérification SMS"
          value={otpInput}
          onChange={(v) => {
            setOtpInput(v)
            if (otpError) setOtpError(null)
          }}
          onComplete={verifyOtp}
          invalid={Boolean(otpError)}
        />
        {otpError ? (
          <p role="alert" className="text-sm text-destructive">
            {otpError}
          </p>
        ) : null}
        <div className="text-center text-sm text-muted-foreground">
          {resendLeft > 0 ? (
            <span>
              Renvoyer le code dans <span className="font-mono text-foreground">0:{String(resendLeft).padStart(2, '0')}</span>
            </span>
          ) : (
            <button type="button" onClick={sendOtp} className="font-semibold text-primary hover:underline">
              Renvoyer le code
            </button>
          )}
        </div>
      </AuthStep>
    )
  }

  if (step === 'register-pin' || step === 'register-pin-confirm') {
    const confirming = step === 'register-pin-confirm'
    return (
      <AuthStep
        title={confirming ? 'Confirmez votre code' : 'Créez votre code secret'}
        subtitle={
          confirming
            ? 'Saisissez à nouveau votre code à 6 chiffres.'
            : 'Ce code à 6 chiffres vous servira à vous connecter. Ne le partagez avec personne.'
        }
        step={{ current: 3, total: 3 }}
        onBack={() => {
          setPin('')
          setPinConfirm('')
          goto(confirming ? 'register-pin' : 'register-otp')
        }}
      >
        <div className="flex items-center justify-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15">
            <KeyRound className="size-7 text-primary" aria-hidden="true" />
          </span>
        </div>
        <p role="alert" className="min-h-5 text-center text-sm text-destructive">
          {pinError}
        </p>
        <PinPad
          key={step}
          value={confirming ? pinConfirm : pin}
          onChange={(v) => {
            if (pinError) setPinError(null)
            if (confirming) setPinConfirm(v)
            else setPin(v)
          }}
          onComplete={confirming ? confirmPin : choosePin}
          invalid={Boolean(pinError)}
        />
      </AuthStep>
    )
  }

  if (step === 'register-done' && createdAccount) {
    return (
      <AuthStep title={`Bienvenue, ${createdAccount.firstName} !`} subtitle="Votre compte est vérifié et sécurisé.">
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="relative flex size-28 items-center justify-center">
            <span className="sos-ring absolute inset-0 rounded-full bg-success/30" aria-hidden="true" />
            <span className="relative flex size-24 items-center justify-center rounded-full bg-success text-background">
              <Check className="size-12" strokeWidth={3} aria-hidden="true" />
            </span>
          </div>
          <ul className="flex w-full flex-col gap-2 rounded-2xl border bg-card p-4 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Téléphone</span>
              <span className="font-mono">{formatPhone(createdAccount.phone)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Vérification SMS</span>
              <span className="inline-flex items-center gap-1 text-success">
                <ShieldCheck className="size-4" aria-hidden="true" /> Validée
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Code secret</span>
              <span className="font-mono tracking-widest">••••••</span>
            </li>
          </ul>
        </div>
        <PrimaryButton onClick={() => onLogin(createdAccount)}>
          Accéder à l’application
          <ArrowRight className="size-5" aria-hidden="true" />
        </PrimaryButton>
      </AuthStep>
    )
  }

  if (step === 'login-phone') {
    return (
      <AuthStep
        title="Connexion"
        subtitle="Entrez le numéro utilisé lors de votre inscription."
        onBack={() => goto('welcome')}
        footer={
          <>
            {loginError ? (
              <p role="alert" className="text-sm text-destructive">
                {loginError}
              </p>
            ) : null}
            <PrimaryButton type="submit" form="login-form" disabled={loginPhone.replace(/\D/g, '').length < 8}>
              Continuer
            </PrimaryButton>
            <button
              type="button"
              onClick={() => goto('register-info')}
              className="h-12 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Pas encore de compte ? <span className="text-primary">S’inscrire</span>
            </button>
          </>
        }
      >
        <form id="login-form" onSubmit={submitLoginPhone}>
          <PhoneField
            countryCode={loginCountry}
            phone={loginPhone}
            onCountryCodeChange={setLoginCountry}
            onPhoneChange={(v) => {
              setLoginPhone(v)
              if (loginError) setLoginError(null)
            }}
            autoFocus
          />
        </form>
      </AuthStep>
    )
  }

  if (step === 'login-pin' && loginAccount) {
    const locked = attempts >= MAX_PIN_ATTEMPTS
    return (
      <AuthStep
        title={`Bonjour ${loginAccount.firstName}`}
        subtitle={
          <>
            Saisissez votre code secret pour{' '}
            <span className="font-mono text-foreground">{formatPhone(loginAccount.phone)}</span>
          </>
        }
        onBack={() => goto('login-phone')}
      >
        <div className="flex items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-xl font-bold">
            {loginAccount.firstName[0]}
            {loginAccount.lastName[0]}
          </span>
        </div>
        <p role="alert" className="min-h-5 text-center text-sm text-destructive">
          {pinError}
        </p>
        <PinPad
          value={loginPin}
          onChange={(v) => {
            if (pinError && !locked) setPinError(null)
            setLoginPin(v)
          }}
          onComplete={checkLoginPin}
          invalid={Boolean(pinError)}
          disabled={locked}
        />
      </AuthStep>
    )
  }

  return null
}
