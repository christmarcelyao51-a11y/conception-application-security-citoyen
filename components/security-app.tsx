'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { AuthFlow } from '@/components/auth/auth-flow'
import type { Account, PublicAccount } from '@/lib/auth-demo'

export function SecurityApp() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentUser, setCurrentUser] = useState<PublicAccount | null>(null)

  function toPublic({ pinHash: _pinHash, ...rest }: Account): PublicAccount {
    return rest
  }

  if (!currentUser) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-md bg-background shadow-2xl shadow-black/50 md:border-x">
        <AuthFlow
          accounts={accounts}
          onRegister={(account) => setAccounts((prev) => [...prev, account])}
          onLogin={(account) => setCurrentUser(toPublic(account))}
        />
      </div>
    )
  }

  return <AppShell user={currentUser} onLogout={() => setCurrentUser(null)} />
}
