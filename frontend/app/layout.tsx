import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import './tokens.css'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'STR Comply — Short-Term Rental Compliance',
  description:
    'Fast, source-linked short-term rental compliance lookups for LA-area markets. Know if a market is worth pursuing before you invest.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        <SessionProvider>
          <Nav />
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
