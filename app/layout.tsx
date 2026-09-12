import type { Metadata, Viewport } from 'next'
import { Caveat, Nunito, Quicksand } from 'next/font/google'
import './globals.css'

const body = Nunito({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' })
const round = Quicksand({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-round', display: 'swap' })
const script = Caveat({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-script', display: 'swap' })

export const metadata: Metadata = {
  title: 'Harbor — A little closer, every day',
  description: 'A gentle place for family connection. Share little moments, find time together, and watch your meadow grow. Interactive mobile demo.',
  appleWebApp: { capable: true, title: 'Harbor', statusBarStyle: 'black-translucent' },
}
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover',
  themeColor: '#9ECDE8', colorScheme: 'light',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`light ${body.variable} ${round.variable} ${script.variable}`}><body className="font-sans">{children}</body></html>
}
