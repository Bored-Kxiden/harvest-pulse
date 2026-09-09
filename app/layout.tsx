import type { Metadata, Viewport } from 'next'
import { DM_Sans, Lora } from 'next/font/google'
import './globals.css'

const sans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const serif = Lora({ subsets: ['latin'], variable: '--font-lora' })

export const metadata: Metadata = {
  title: 'Harbor — A little closer, every day',
  description: 'A gentle place for family connection. Share little moments, find time together, and watch your garden grow. Interactive mobile demo.',
  appleWebApp: { capable: true, title: 'Harbor', statusBarStyle: 'default' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f8f7f1', colorScheme: 'light' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`light bg-background ${sans.variable} ${serif.variable}`}><body className="font-sans">{children}</body></html>
}
