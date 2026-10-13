import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import ClientLayout from "@/components/client-layout"
import { APP_NAME, APP_DESC } from "@/lib/config"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESC,
  manifest: "/manifest.json",
  icons: { icon: "/logo.png", shortcut: "/logo.png", apple: "/logo.png" },
}

export const viewport: Viewport = {
  themeColor: "#0369a1",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={geistSans.variable}>
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}