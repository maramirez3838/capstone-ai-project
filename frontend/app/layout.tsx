import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
