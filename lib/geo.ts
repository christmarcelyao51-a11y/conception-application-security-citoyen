import type { ServiceId } from './services'

export type LatLng = { lat: number; lng: number }

export const DEFAULT_POSITION: LatLng = { lat: 5.3364, lng: -4.0267 }

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function interpolate(from: LatLng, to: LatLng, t: number): LatLng {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  }
}

export type Station = {
  id: string
  serviceId: ServiceId
  name: string
  position: LatLng
}

const STATION_OFFSETS: Record<ServiceId, { name: string; dLat: number; dLng: number }[]> = {
  police: [
    { name: 'Commissariat du 1er arrondissement', dLat: 0.012, dLng: -0.009 },
    { name: 'Poste de Police Secours', dLat: -0.018, dLng: 0.014 },
  ],
  gendarmerie: [{ name: 'Brigade de Gendarmerie', dLat: 0.022, dLng: 0.019 }],
  samu: [
    { name: 'Base SAMU — CHU', dLat: -0.009, dLng: -0.017 },
    { name: 'Antenne SAMU', dLat: 0.026, dLng: -0.024 },
  ],
  pompiers: [{ name: 'Caserne des Sapeurs-pompiers', dLat: -0.021, dLng: -0.006 }],
  ccdo: [{ name: 'Base opérationnelle CCDO', dLat: 0.015, dLng: 0.027 }],
  autre: [{ name: 'Protection civile', dLat: -0.027, dLng: 0.022 }],
}

export function getNearbyStations(center: LatLng): Station[] {
  return (Object.keys(STATION_OFFSETS) as ServiceId[]).flatMap((serviceId) =>
    STATION_OFFSETS[serviceId].map((o, i) => ({
      id: `${serviceId}-${i}`,
      serviceId,
      name: o.name,
      position: { lat: center.lat + o.dLat, lng: center.lng + o.dLng },
    })),
  )
}

export function getNearestStation(center: LatLng, serviceId: ServiceId): Station {
  const stations = getNearbyStations(center).filter((s) => s.serviceId === serviceId)
  return stations.sort(
    (a, b) => distanceKm(center, a.position) - distanceKm(center, b.position),
  )[0]
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}
