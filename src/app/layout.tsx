import type { Metadata } from 'next'
import { Inter, Poppins, Gloria_Hallelujah } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const gloriaHallelujah = Gloria_Hallelujah({
  variable: '--font-gloria',
  subsets: ['latin'],
  weight: ['400'],
})

export const metadata: Metadata = {
  title: 'Meeting Prep Tool',
  description:
    'Generate concise dossiers for any LinkedIn contact using AI and web research',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable} ${gloriaHallelujah.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
