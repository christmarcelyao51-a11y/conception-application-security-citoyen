import type { Analysis } from './analysis'
import type { LatLng, Station } from './geo'
import type { ServiceId } from './services'

export type AlertStatus = 'envoyee' | 'en-route' | 'sur-place' | 'cloturee' | 'annulee'

export type SentAlert = {
  id: string
  serviceId: ServiceId
  createdAt: number
  description: string
  transcript: string
  hasVideo: boolean
  analysis: Analysis | null
  userPosition: LatLng
  station: Station
  status: AlertStatus
  statusUpdatedAt?: number
  assignedTo?: string
  reporter?: { name: string; phone: string }
}

export const URGENCY_LABELS: Record<Analysis['urgencyLevel'], string> = {
  critique: 'Critique',
  elevee: 'Élevée',
  moderee: 'Modérée',
  faible: 'Faible',
}

export const RISK_LABELS: Record<Analysis['falseAlertRisk'], string> = {
  faible: 'Faible',
  moyen: 'Moyen',
  eleve: 'Élevé',
}
