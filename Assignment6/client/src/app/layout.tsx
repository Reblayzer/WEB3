import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UNO',
  description: 'UNO with Next.js (Redux + RxJS)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
