"use client"

import { Menu, LogOut } from "lucide-react"
import { logout } from "@/lib/auth/client"

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center min-w-[40px]">
        <button
          aria-label="Buka menu"
          className="lg:hidden p-2 text-slate-500 hover:bg-sky-50 rounded-md transition-colors"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
      </div>

      <button
        onClick={logout}
        className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
      >
        <span className="text-[10px] font-black uppercase tracking-tighter">Keluar</span>
        <LogOut size={16} />
      </button>
    </header>
  )
}