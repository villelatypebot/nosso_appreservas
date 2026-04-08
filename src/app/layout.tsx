import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { defaultBrandSettings, getBrandInitials } from '@/lib/brand'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: defaultBrandSettings.shortName,
  description: defaultBrandSettings.description,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href={`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='${encodeURIComponent(defaultBrandSettings.primaryColor)}'/><text y='.9em' font-size='60' font-family='sans-serif' font-weight='900' fill='white' x='10'>${getBrandInitials(defaultBrandSettings.shortName)}</text></svg>`} />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
