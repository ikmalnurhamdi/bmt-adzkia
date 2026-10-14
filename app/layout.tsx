import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { PLATFORM_NAME, PLATFORM_DESC } from "@/lib/brand"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

/**
 * Layout akar hanya menyediakan <html>/<body>.
 * Kerangka tiap aplikasi (sidebar, header, footer) ada di app/bmt/layout.tsx dan app/mts/layout.tsx.
 */
export const metadata: Metadata = {
  title: { default: PLATFORM_NAME, template: `%s · ${PLATFORM_NAME}` },
  description: PLATFORM_DESC,
  icons: { icon: "/logo.png", shortcut: "/logo.png", apple: "/logo.png" },
}

export const viewport: Viewport = {
  themeColor: "#0369a1",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={geistSans.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}