"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isOpenMobile, setIsOpenMobile] = useState(false)
  const pathname = usePathname()

  // Halaman login tampil polos tanpa sidebar/header
  if (pathname === "/login") return <>{children}</>

  return (
    <div className="min-h-screen flex">
      <Sidebar pathname={pathname} isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setIsOpenMobile(true)} />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  )
}