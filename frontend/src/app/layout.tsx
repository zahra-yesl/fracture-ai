import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FractureAI — Détection de Fractures par IA',
  description: 'Système d\'aide à la décision médicale basé sur l\'intelligence artificielle pour la détection de fractures osseuses à partir de radiographies.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
