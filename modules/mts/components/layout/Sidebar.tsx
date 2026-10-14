"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, Wallet, Settings2, ChevronLeft, ChevronRight,
  AlertCircle, BarChart3, ClipboardList, Repeat,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLE_LABEL, type Role } from "@/lib/auth/roles"
import { APP_NAME } from "@/modules/mts/lib/config"

interface SidebarProps {
  role: Role
  isOpenMobile: boolean
  setIsOpenMobile: (open: boolean) => void
}

const MENU = [
  { href: "/mts", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mts/siswa", label: "Data Siswa", icon: Users },
  { href: "/mts/transaksi", label: "Transaksi", icon: Wallet },
  { divider: "Laporan" },
  { href: "/mts/tunggakan", label: "Tunggakan", icon: AlertCircle },
  { href: "/mts/rekap-siswa", label: "Rekap Siswa", icon: ClipboardList },
  { href: "/mts/laporan-keuangan", label: "Laporan Keuangan", icon: BarChart3 },
] as const

export default function Sidebar({ role, isOpenMobile, setIsOpenMobile }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "true") setIsCollapsed(true)
  }, [])

  const toggle = (v: boolean) => {
    setIsCollapsed(v)
    localStorage.setItem("sidebar-collapsed", String(v))
  }

  const isActive = (href: string) => (href === "/mts" ? pathname === "/mts" : pathname.startsWith(href))
  const closeMobile = () => isOpenMobile && setIsOpenMobile(false)

  return (
    <>
      {isOpenMobile && (
        <div className="fixed inset-0 bg-black/40 z-[60] lg:hidden" onClick={() => setIsOpenMobile(false)} />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-[70] h-screen shrink-0 bg-gradient-to-b from-sky-700 to-sky-800 text-white flex flex-col shadow-xl transition-[width,transform] duration-200",
          isCollapsed ? "w-16" : "w-60",
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={cn("py-5 px-4 border-b border-white/10 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white p-1.5 rounded-xl shrink-0 shadow-lg shadow-sky-950/20">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="object-contain" priority />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="font-black tracking-tight text-[15px] leading-none uppercase truncate">{APP_NAME}</p>
                <p className="text-[8px] font-bold text-sky-200 uppercase tracking-widest mt-1">Rekap Keuangan</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              aria-label="Ciutkan sidebar"
              className="hidden lg:flex p-1.5 hover:bg-white/10 rounded-lg text-sky-200 hover:text-white"
              onClick={() => toggle(true)}
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {isCollapsed && (
          <button
            aria-label="Lebarkan sidebar"
            onClick={() => toggle(false)}
            className="hidden lg:flex absolute -right-3 top-16 bg-yellow-400 p-1 rounded-full border-2 border-sky-700 z-[80] text-sky-900 shadow-lg hover:scale-110 transition-transform"
          >
            <ChevronRight size={14} strokeWidth={4} />
          </button>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto sidebar-scroll">
          {MENU.map((m, i) =>
            "divider" in m ? (
              <div key={i} className="pt-4 pb-1 px-3 flex items-center gap-2 opacity-40">
                {!isCollapsed && <span className="text-[9px] font-black uppercase tracking-widest">{m.divider}</span>}
                <div className="h-px bg-white flex-1" />
              </div>
            ) : (
              <NavItem key={m.href} {...m} active={isActive(m.href)} collapsed={isCollapsed} onClick={closeMobile} />
            )
          )}
          <div className="pt-3 mt-3 border-t border-white/10 space-y-1">
            <NavItem
              href="/mts/pengaturan" label="Pengaturan" icon={Settings2}
              active={isActive("/mts/pengaturan")} collapsed={isCollapsed} onClick={closeMobile}
            />
            {role === "admin" && (
              <NavItem href="/" label="Ganti Aplikasi" icon={Repeat} active={false} collapsed={isCollapsed} onClick={closeMobile} />
            )}
          </div>
        </nav>

        {!isCollapsed && (
          <div className="p-4 border-t border-white/10 flex items-center justify-center gap-2 opacity-50">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]">v2.0 · {ROLE_LABEL[role]}</p>
          </div>
        )}
      </aside>
    </>
  )
}

function NavItem({ href, label, icon: Icon, active, collapsed, onClick }: {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-colors font-bold text-[13px]",
        active ? "bg-yellow-400 text-sky-900 shadow-lg shadow-sky-950/20" : "text-sky-50 hover:bg-white/10",
        collapsed && "justify-center"
      )}
    >
      <Icon size={20} />
      {!collapsed && <span className="whitespace-nowrap tracking-tight">{label}</span>}
    </Link>
  )
}