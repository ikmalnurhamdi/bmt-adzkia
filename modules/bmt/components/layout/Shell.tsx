"use client"

import { useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import type { Role } from "@/lib/auth/roles"

/**
 * Kerangka BMT ADZKIA. Footer diteruskan sebagai prop dari server layout
 * agar tetap berupa server component (tidak menambah JS di browser).
 */
export default function BmtShell({ role, footer, children }: { role: Role; footer: React.ReactNode; children: React.ReactNode }) {
  const [isOpenMobile, setIsOpenMobile] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-black">
      {/* Sidebar & Header persisten: tidak reload saat pindah halaman */}
      <Sidebar role={role} isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setIsOpenMobile(true)} />

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">{children}</main>
            {footer}
          </div>
        </div>
      </div>
    </div>
  )
}
