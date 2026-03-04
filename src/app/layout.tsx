import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Full House — Comida de Festa',
  description: 'Reserve sua mesa no Full House — Rodízio de Comida de Festa. Confirmação imediata pelo WhatsApp.',
  themeColor: '#000000',
  viewport: { width: 'device-width', initialScale: 1 },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23F47920'/><text y='.9em' font-size='60' font-family='sans-serif' font-weight='900' fill='white' x='10'>FH</text></svg>" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
