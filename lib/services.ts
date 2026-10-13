import {
  Ambulance,
  Flame,
  Radio,
  ShieldAlert,
  ShieldCheck,
  LifeBuoy,
  type LucideIcon,
} from 'lucide-react'

export type ServiceId = 'police' | 'gendarmerie' | 'samu' | 'pompiers' | 'ccdo' | 'autre'

export type EmergencyService = {
  id: ServiceId
  label: string
  description: string
  icon: LucideIcon
  logo?: string
  phone?: string
  unitName: string
}

export const SERVICES: EmergencyService[] = [
  {
    id: 'police',
    label: 'Police',
    description: 'Agression, vol, violence',
    icon: ShieldAlert,
    logo: '/logos/police.png',
    phone: '170',
    unitName: 'Patrouille Police Secours',
  },
  {
    id: 'gendarmerie',
    label: 'Gendarmerie',
    description: 'Sécurité, zones rurales',
    icon: ShieldCheck,
    logo: '/logos/gendarmerie.png',
    unitName: 'Brigade de Gendarmerie',
  },
  {
    id: 'samu',
    label: 'SAMU',
    description: 'Urgence médicale',
    icon: Ambulance,
    logo: '/logos/samu-ci.png',
    phone: '185',
    unitName: 'Ambulance SAMU',
  },
  {
    id: 'pompiers',
    label: 'Sapeurs-pompiers',
    description: 'Incendie, accident',
    icon: Flame,
    logo: '/logos/gspm.png',
    phone: '180',
    unitName: 'Véhicule de secours GSPM',
  },
  {
    id: 'ccdo',
    label: 'CCDO',
    description: 'Coordination opérationnelle',
    icon: Radio,
    logo: '/logos/ccdo-ci.png',
    unitName: 'Unité d’intervention CCDO',
  },
  {
    id: 'autre',
    label: 'Autre urgence',
    description: 'Protection civile, etc.',
    icon: LifeBuoy,
    unitName: 'Unité de protection civile',
  },
]

export function getService(id: ServiceId): EmergencyService {
  return SERVICES.find((s) => s.id === id) ?? SERVICES[SERVICES.length - 1]
}
