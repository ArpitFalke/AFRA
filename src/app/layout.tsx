import type { Metadata, Viewport } from 'next'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/900.css'
import '@fontsource/bebas-neue/400.css'
import '@fontsource/saira-condensed/700.css'
import '@fontsource/saira-condensed/900.css'
import '@fontsource/archivo-black/400.css'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AFRA — Create in 3D. Make it yours.',
    template: '%s · AFRA',
  },
  description:
    'AFRA is a 3D creative design studio. Generate or build a design, edit it as a real design, see it in 3D, and export it — t-shirts, jerseys, sneakers, liveries, posters and more.',
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#0D0D0E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-afra-bg text-afra-white antialiased">{children}</body>
    </html>
  )
}
