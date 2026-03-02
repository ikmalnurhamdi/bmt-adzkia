"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { usePathname } from "next/navigation"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isOpenMobile, setIsOpenMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // Mencegah Hydration Error
  useEffect(() => {
    setMounted(true)
  }, [])

  // Jika halaman Login, tampilkan tanpa Sidebar/Header
  const isLoginPage = pathname === "/login"
  if (isLoginPage) return <>{children}</>

  // Otomatis tentukan tab mana yang aktif di sidebar berdasarkan URL
  const activeTab = pathname === "/" ? "overview" : pathname.split("/")[1]

  // Tampilkan layar kosong sejenak untuk sinkronisasi client-server (mencegah kedip putih)
  if (!mounted) return <div className="min-h-screen bg-[#F8FAFC]" />

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-black">
      {/* Sidebar Persistent: Tidak akan reload saat pindah halaman */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={() => {}} 
        isOpenMobile={isOpenMobile} 
        setIsOpenMobile={setIsOpenMobile} 
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Persistent */}
        <Header onMenuClick={() => setIsOpenMobile(true)} />
        
        {/* Konten Halaman yang berubah-ubah */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}