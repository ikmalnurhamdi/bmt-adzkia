import type { Metadata, Viewport } from "next"
import { Geist_Mono } from "next/font/google"
import { requireApp } from "@/lib/auth/server"
import BmtShell from "@/modules/bmt/components/layout/Shell"
import Footer from "@/modules/bmt/components/layout/Footer"

// Font mono hanya dimuat di dalam aplikasi BMT (dipakai angka/nominal pada tampilan lama).
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: { default: "BMT ADZKIA", template: "%s · BMT ADZKIA" },
  description: "Aplikasi Keuangan Pesantren Al-Hidayah Cisadap",
  manifest: "/bmt.webmanifest",
}

export const viewport: Viewport = {
  themeColor: "#0284c7",
}

export default async function BmtLayout({ children }: { children: React.ReactNode }) {
  // Lapisan pertahanan kedua: hanya peran bmt & admin yang boleh masuk.
  const user = await requireApp("bmt")

  return (
    <div className={`${geistMono.variable} bmt-theme`}>
      <BmtShell role={user.role} footer={<Footer />}>
        {children}
      </BmtShell>
    </div>
  )
}
