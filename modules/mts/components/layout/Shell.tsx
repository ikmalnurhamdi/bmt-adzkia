"use client"

import { useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import type { Role } from "@/lib/auth/roles"

/** Kerangka MTs ADZKIA MOBILE. Footer disuntik dari server layout (tetap server component). */
export default function MtsShell({ role, footer, children }: { role: Role; footer: React.ReactNode; children: React.ReactNode }) {
  const [isOpenMobile, setIsOpenMobile] = useState(false)

  return (
    <div className="min-h-screen flex">
      <Sidebar role={role} isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setIsOpenMobile(true)} />
        <main className="flex-1">{children}</main>
        {footer}
      </div>
    </div>
  )
}