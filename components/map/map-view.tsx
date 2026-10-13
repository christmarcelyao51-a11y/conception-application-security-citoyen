'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import type { LatLng, Station } from '@/lib/geo'

export type MapUnit = { position: LatLng; label: string }

type MapViewProps = {
  user: LatLng
  accuracy?: number | null
  stations?: Station[]
  highlightStationId?: string
  unit?: MapUnit
  route?: [LatLng, LatLng]
  className?: string
}

function pinIcon(kind: 'user' | 'station' | 'station-active' | 'unit') {
  const styles: Record<typeof kind, string> = {
    user: 'width:18px;height:18px;border-radius:9999px;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,.3)',
    station:
      'width:14px;height:14px;border-radius:4px;background:#94a3b8;border:2px solid #1e293b',
    'station-active':
      'width:16px;height:16px;border-radius:4px;background:#f59e0b;border:2px solid #fff',
    unit: 'width:22px;height:22px;border-radius:9999px;background:#ef4444;border:3px solid #fff;box-shadow:0 0 0 6px rgba(239,68,68,.35)',
  }
  const size = kind === 'unit' ? 22 : kind === 'user' ? 18 : 16
  return L.divIcon({
    className: 'map-pin',
    html: `<div style="${styles[kind]}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
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
        { padding: [40, 40], maxZoom: 16 },
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
        <Popup>Votre position</Popup>
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
          pathOptions={{ color: '#ef4444', weight: 4, dashArray: '8 8', opacity: 0.85 }}
        />
      ) : null}

      {unit ? (
        <Marker position={[unit.position.lat, unit.position.lng]} icon={pinIcon('unit')}>
          <Popup>{unit.label}</Popup>
        </Marker>
      ) : null}
    </MapContainer>
  )
}
