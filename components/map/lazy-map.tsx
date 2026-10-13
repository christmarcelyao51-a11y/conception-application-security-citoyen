'use client'

import dynamic from 'next/dynamic'

export const LazyMap = dynamic(() => import('./map-view'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-secondary text-sm text-muted-foreground">
      Chargement de la carte…
    </div>
  ),
})
