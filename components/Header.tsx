"use client"

import { useState } from "react"
import { Menu, LogOut,} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Keluar Aplikasi?',
      text: "Sesi Anda akan berakhir.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Keluar',
      heightAuto: false
    })

    if (result.isConfirmed) {
      const supabase = getSupabase()
      await supabase.auth.signOut()
      window.location.href = "/login"
    }
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
      
      {/* SISI KIRI: Hanya tombol Menu Mobile (muncul di HP saja) */}
      <div className="flex items-center min-w-[40px]">
        <button 
          className="lg:hidden p-2 text-slate-500 hover:bg-sky-50 rounded-md transition-colors"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
      </div>
      
      {/* SISI KANAN: Tombol Logout */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="h-4 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
        >
          <span className="text-[10px] font-black uppercase tracking-tighter">Keluar</span>
          <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </header>
  )
}