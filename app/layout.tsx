import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CashHox — Payment Portal',
  description: 'Secure multi-vendor payment management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning prevents false positives from browser extensions
          that inject attributes (e.g. bis_register) into the body tag */}
      <body className="min-h-full bg-[#F9FAFB] text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
