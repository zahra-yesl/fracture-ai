import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RadiSense — AI Clinical Agent for Bone Fracture Detection',
  description: 'AI-powered clinical decision support for bone fracture detection from X-ray images.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        {/* Viewport — obligatoire pour le responsive mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Fonts originales — inchangées */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  )
}