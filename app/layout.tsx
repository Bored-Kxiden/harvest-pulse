import type { Metadata, Viewport } from 'next'
import { Nunito, Quicksand } from 'next/font/google'
import './globals.css'

const body = Nunito({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' })
const round = Quicksand({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-round' })

export const metadata: Metadata = {
  title: 'Harbor — A little closer, every day',
  description: 'A gentle place for family connection. Share little moments, find time together, and watch your garden grow. Interactive mobile demo.',
  appleWebApp: { capable: true, title: 'Harbor', statusBarStyle: 'default' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#fcf2e6', colorScheme: 'light' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`light bg-background ${body.variable} ${round.variable}`}><body className="font-sans">{children}</body></html>
}
