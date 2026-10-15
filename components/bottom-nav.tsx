'use client'

import { History, House, Map as MapIcon, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tab = 'accueil' | 'carte' | 'alertes' | 'profil'

const ITEMS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'accueil', label: 'Accueil', icon: House },
  { id: 'carte', label: 'Carte', icon: MapIcon },
  { id: 'alertes', label: 'Alertes', icon: History },
  { id: 'profil', label: 'Profil', icon: User },
]

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-[1000] mx-auto w-full max-w-md border-t bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.id === tab
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex w-full flex-col items-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active ? <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" aria-hidden="true" /> : null}
                <Icon className={cn('size-[19px]', active && 'stroke-[2.2]')} aria-hidden="true" />
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
