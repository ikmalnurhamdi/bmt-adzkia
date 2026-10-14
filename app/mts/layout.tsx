import type { Metadata, Viewport } from "next"
import { requireApp } from "@/lib/auth/server"
import MtsShell from "@/modules/mts/components/layout/Shell"
import Footer from "@/modules/mts/components/layout/Footer"
import { APP_NAME, APP_DESC } from "@/modules/mts/lib/config"

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESC,
  manifest: "/mts.webmanifest",
}

export const viewport: Viewport = {
  themeColor: "#0369a1",
}

export default async function MtsLayout({ children }: { children: React.ReactNode }) {
  // Lapisan pertahanan kedua: hanya peran mts & admin yang boleh masuk.
  const user = await requireApp("mts")

  return (
    <MtsShell role={user.role} footer={<Footer />}>
      {children}
    </MtsShell>
  )
}
