import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'SECURITY CITOYEN — Alerte d’urgence',
  description:
    'Lancez une alerte aux services d’urgence (Police, Gendarmerie, SAMU, Sapeurs-pompiers, CCDO) avec vidéo en direct, saisie vocale, géolocalisation et analyse IA.',
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/images/security-citoyen-logo.png', type: 'image/png' }],
    apple: '/images/security-citoyen-logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#121826',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
