'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_POSITION, type LatLng } from '@/lib/geo'

export type GeoState = {
  position: LatLng
  accuracy: number | null
  status: 'pending' | 'granted' | 'denied' | 'unsupported'
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    position: DEFAULT_POSITION,
    accuracy: null,
    status: 'pending',
  })

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, status: 'unsupported' }))
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setState({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          status: 'granted',
        }),
      () => setState((s) => ({ ...s, status: 'denied' })),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return state
}
