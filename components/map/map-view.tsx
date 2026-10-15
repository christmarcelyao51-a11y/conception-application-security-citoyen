'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { interpolate, type LatLng, type Station } from '@/lib/geo'

export type MapUnit = { position: LatLng; label: string }
export type MovingUnit = { status: 'en-route' | 'sur-place'; statusUpdatedAt?: number; label: string }

type MapViewProps = {
  user: LatLng
  accuracy?: number | null
  stations?: Station[]
  highlightStationId?: string
  unit?: MapUnit
  movingUnit?: MovingUnit
  route?: [LatLng, LatLng]
  className?: string
}

function pinIcon(kind: 'user' | 'station' | 'station-active' | 'unit') {
  const styles: Record<typeof kind, string> = {
    user: 'display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:#ef4444;border:3px solid #fff;box-shadow:0 0 0 6px rgba(239,68,68,.24),0 2px 8px rgba(0,0,0,.35)',
    station:
      'width:14px;height:14px;border-radius:4px;background:#94a3b8;border:2px solid #1e293b',
    'station-active':
      'width:16px;height:16px;border-radius:4px;background:#f59e0b;border:2px solid #fff',
    unit: 'display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9px;background:#059669;border:2px solid #fff;box-shadow:0 0 0 5px rgba(16,185,129,.22),0 2px 8px rgba(0,0,0,.35)',
  }
  const size = kind === 'unit' ? 28 : kind === 'user' ? 22 : 16
  const unitGlyph = kind === 'unit'
    ? '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/></svg>'
    : ''
  return L.divIcon({
    className: 'map-pin',
    html: `<div style="${styles[kind]}">${unitGlyph}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function vehicleIcon() {
  return L.divIcon({
    className: 'map-pin map-vehicle-pin',
    html: '<span class="map-vehicle-shell"><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10l3 6v10a1 1 0 0 1-1 1h-2v-2H7v2H5a1 1 0 0 1-1-1V9l3-6Z"/><path d="M4 9h16M8 13h.01M16 13h.01M9 18v-2h6v2"/></svg></span>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  })
}

function MovingVehicle({ route, unit }: { route: [LatLng, LatLng]; unit: MovingUnit }) {
  const [position, setPosition] = useState<LatLng>(route[0])

  useEffect(() => {
    if (unit.status === 'sur-place') {
      setPosition(route[1])
      return
    }

    const startTime = typeof unit.statusUpdatedAt === 'number' ? unit.statusUpdatedAt : Date.now()
    const durationMs = 30_000
    const maxProgress = 0.86
    const updatePosition = () => {
      const progress = Math.min(1, Math.max(0, (Date.now() - startTime) / durationMs))
      const easedProgress = progress * progress * (3 - 2 * progress)
      setPosition(interpolate(route[0], route[1], maxProgress * easedProgress))
      return progress >= 1
    }

    if (updatePosition()) return
    const timer = window.setInterval(() => {
      if (updatePosition()) window.clearInterval(timer)
    }, 50)
    return () => window.clearInterval(timer)
  }, [route[0].lat, route[0].lng, route[1].lat, route[1].lng, unit.status, unit.statusUpdatedAt])

  return (
    <Marker position={[position.lat, position.lng]} icon={vehicleIcon()} zIndexOffset={1100}>
      <Popup>{unit.label} · position animée à titre illustratif (sans GPS embarqué)</Popup>
    </Marker>
  )
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|')
  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
    } else if (points.length > 1) {
      map.fitBounds(
        L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [72, 96], maxZoom: 16 },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

export default function MapView({
  user,
  accuracy,
  stations = [],
  highlightStationId,
  unit,
  movingUnit,
  route,
  className,
}: MapViewProps) {
  const fitPoints = route ? [route[0], route[1]] : [user, ...stations.map((s) => s.position)]

  return (
    <MapContainer
      center={[user.lat, user.lng]}
      zoom={14}
      zoomControl={false}
      attributionControl
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
      />
      <FitBounds points={fitPoints} />

      {accuracy ? (
        <Circle
          center={[user.lat, user.lng]}
          radius={Math.min(accuracy, 500)}
          pathOptions={{ color: '#3b82f6', weight: 1, fillOpacity: 0.12 }}
        />
      ) : null}

      <Marker position={[user.lat, user.lng]} icon={pinIcon('user')}>
        <Popup>Point du signalement citoyen</Popup>
      </Marker>

      {stations.map((s) => (
        <Marker
          key={s.id}
          position={[s.position.lat, s.position.lng]}
          icon={pinIcon(s.id === highlightStationId ? 'station-active' : 'station')}
        >
          <Popup>{s.name}</Popup>
        </Marker>
      ))}

      {route ? (
        <Polyline
          positions={route.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: '#0ea5e9', weight: 4, dashArray: '7 8', lineCap: 'round', opacity: 0.9 }}
        />
      ) : null}

      {route && movingUnit ? <MovingVehicle key={`${movingUnit.status}-${movingUnit.statusUpdatedAt ?? 'now'}`} route={route} unit={movingUnit} /> : null}

      {unit ? (
        <Marker position={[unit.position.lat, unit.position.lng]} icon={pinIcon('unit')}>
          <Popup>{unit.label}</Popup>
        </Marker>
      ) : null}
    </MapContainer>
  )
}
