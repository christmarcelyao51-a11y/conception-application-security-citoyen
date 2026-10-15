'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, Check, HeartPulse, ImagePlus, LogOut, Phone, Save, ShieldCheck, Trash2, User } from 'lucide-react'
import type { PublicAccount } from '@/lib/auth-demo'

type ProfileScreenProps = {
  user: PublicAccount
  avatarUrl: string | null
  onAvatarChange: (url: string | null) => void
  onLogout: () => void
}

type ProfileDetails = {
  firstName: string
  lastName: string
  phone: string
  city: string
  bloodType: string
  healthNotes: string
  emergencyName: string
  emergencyPhone: string
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border bg-background/70 px-3 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </div>
  )
}

function initialDetails(user: PublicAccount): ProfileDetails {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    city: user.city,
    bloodType: '',
    healthNotes: '',
    emergencyName: '',
    emergencyPhone: '',
  }
}

export function ProfileScreen({ user, avatarUrl, onAvatarChange, onLogout }: ProfileScreenProps) {
  const [details, setDetails] = useState(() => initialDetails(user))
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem(`security-citoyen-profile-${user.id}`)
    if (!saved) return
    try {
      setDetails({ ...initialDetails(user), ...JSON.parse(saved) as Partial<ProfileDetails> })
    } catch {
      window.localStorage.removeItem(`security-citoyen-profile-${user.id}`)
    }
  }, [user])

  function update<K extends keyof ProfileDetails>(key: K, value: ProfileDetails[K]) {
    setDetails((current) => ({ ...current, [key]: value }))
    setSaveMessage(null)
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setPhotoError(null)
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choisissez une image JPG, PNG ou WebP.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setPhotoError('La photo doit faire 3 Mo ou moins.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      const image = new window.Image()
      image.onload = () => {
        const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.naturalWidth * scale)
        canvas.height = Math.round(image.naturalHeight * scale)
        const context = canvas.getContext('2d')
        if (!context) {
          setPhotoError('Impossible de préparer cette image. Réessayez.')
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        onAvatarChange(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.onerror = () => setPhotoError('Impossible de lire cette image. Réessayez.')
      image.src = reader.result
    }
    reader.onerror = () => setPhotoError('Impossible de lire cette image. Réessayez.')
    reader.readAsDataURL(file)
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      window.localStorage.setItem(`security-citoyen-profile-${user.id}`, JSON.stringify(details))
      setSaveMessage('Profil enregistré sur cet appareil.')
    } catch {
      setSaveMessage('Enregistrement impossible. Libérez de l’espace sur cet appareil et réessayez.')
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-32">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Mon espace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Profil et santé</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gardez vos informations utiles à portée de main.</p>
      </header>

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative size-20 shrink-0 rounded-full bg-secondary p-1 ring-1 ring-border">
              <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold text-primary">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={`Photo de ${details.firstName}`} className="size-full object-cover" />
              ) : (
                <span aria-hidden="true">{details.firstName[0]}{details.lastName[0]}</span>
              )}
            </div>
            <span className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
              <Camera className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{details.firstName} {details.lastName}</h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{details.city || 'Ville à renseigner'}</p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80">
              <ImagePlus className="size-3.5" aria-hidden="true" />
              {avatarUrl ? 'Changer la photo' : 'Ajouter une photo'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} className="sr-only" />
            </label>
          </div>
          {avatarUrl ? (
            <button
              type="button"
              onClick={() => { onAvatarChange(null); setPhotoError(null) }}
              aria-label="Supprimer la photo de profil"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background/60 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {photoError ? <p role="alert" className="relative mt-3 text-xs text-destructive">{photoError}</p> : null}
      </section>

      <form className="flex flex-col gap-4" onSubmit={saveProfile}>
        <fieldset className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-4 shadow-sm shadow-black/5">
          <legend className="sr-only">Informations personnelles</legend>
          <div className="flex items-center gap-3 border-b pb-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Informations personnelles</h2>
              <p className="text-xs text-muted-foreground">Vos coordonnées de contact</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="first-name" label="Prénom" value={details.firstName} onChange={(v) => update('firstName', v)} />
            <Field id="last-name" label="Nom" value={details.lastName} onChange={(v) => update('lastName', v)} />
          </div>
          <Field id="phone" label="Téléphone" type="tel" value={details.phone} onChange={(v) => update('phone', v)} />
          <Field id="city" label="Ville ou commune" value={details.city} onChange={(v) => update('city', v)} placeholder="Abidjan, Cocody…" />
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-4 shadow-sm shadow-black/5">
          <legend className="sr-only">Informations médicales</legend>
          <div className="flex items-center gap-3 border-b pb-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
              <HeartPulse className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Informations médicales</h2>
              <p className="text-xs text-muted-foreground">Facultatives, à partager en cas d’urgence</p>
            </div>
          </div>
          <Field id="blood" label="Groupe sanguin" value={details.bloodType} onChange={(v) => update('bloodType', v)} placeholder="Ex. O+" />
          <Field id="health-notes" label="Allergies ou traitements" value={details.healthNotes} onChange={(v) => update('healthNotes', v)} placeholder="Ex. allergie à la pénicilline" />
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-4 shadow-sm shadow-black/5">
          <legend className="sr-only">Contact à prévenir</legend>
          <div className="flex items-center gap-3 border-b pb-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
              <Phone className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Contact à prévenir</h2>
              <p className="text-xs text-muted-foreground">Une personne de confiance</p>
            </div>
          </div>
          <Field id="contact-name" label="Nom du proche" value={details.emergencyName} onChange={(v) => update('emergencyName', v)} />
          <Field id="contact-phone" label="Téléphone du proche" type="tel" value={details.emergencyPhone} onChange={(v) => update('emergencyPhone', v)} />
        </fieldset>

        <div className="flex gap-3 rounded-xl border bg-secondary/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
          <p>Ces informations restent enregistrées sur cet appareil. Elles ne sont pas envoyées aux secours par cette version de l’application.</p>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.99]">
            <Save className="size-4" aria-hidden="true" />
            Enregistrer le profil
          </button>
          {saveMessage ? (
            <span role="status" className="flex max-w-32 items-center gap-1 text-xs text-success">
              <Check className="size-4 shrink-0" aria-hidden="true" />{saveMessage}
            </span>
          ) : null}
        </div>
      </form>

      <button type="button" onClick={onLogout} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-destructive/20 text-sm font-semibold text-destructive transition hover:bg-destructive/5">
        <LogOut className="size-4" aria-hidden="true" />
        Se déconnecter
      </button>
    </div>
  )
}
