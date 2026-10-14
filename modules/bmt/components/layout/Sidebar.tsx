"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, Wallet, Settings2, ChevronLeft, ChevronRight,
  AlertCircle, Utensils, Coins, BarChart3, ClipboardList, Repeat,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLE_BADGE, ROLE_LABEL, type Role } from "@/lib/auth/roles"

interface SidebarProps {
  role: Role
  isOpenMobile: boolean
  setIsOpenMobile: (open: boolean) => void
}

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number }>; exact?: boolean }

const MENU_UTAMA: Item[] = [
  { href: "/bmt", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/bmt/santri", label: "Data Santri", icon: Users },
  { href: "/bmt/transaksi", label: "Transaksi", icon: Wallet },
]

const MENU_LAPORAN: Item[] = [
  { href: "/bmt/dashboard-dpu", label: "Laporan DPU", icon: Utensils },
  { href: "/bmt/uang-jajan", label: "Uang Saku", icon: Coins },
  { href: "/bmt/tunggakan", label: "Tunggakan", icon: AlertCircle },
  { href: "/bmt/laporan-keuangan", label: "Laporan Keuangan", icon: BarChart3 },
  { href: "/bmt/rekap-transaksi-santri", label: "Rekap Transaksi", icon: ClipboardList },
]

const MENU_PENGATURAN: Item = { href: "/bmt/pengaturan-iuran", label: "Pengaturan Biaya", icon: Settings2 }

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

  const isActive = (i: Item) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"))
  const closeMobile = () => {
    if (isOpenMobile) setIsOpenMobile(false)
  }

  return (
    <>
      {/* Overlay Mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-[70] h-screen shrink-0 bg-sky-600 text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl border-r border-sky-500/30",
          isCollapsed ? "w-17" : "w-59",
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Dekorasi Grid Halus */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header Sidebar */}
          <div className={cn("py-6 px-4 flex flex-col border-b border-sky-400/20 transition-all", isCollapsed ? "items-center" : "items-start")}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-xl shrink-0 flex items-center justify-center shadow-lg shadow-sky-900/20">
                  <Image src="/logo.png" alt="Logo BMT ADZKIA" width={24} height={24} className="object-contain" priority />
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="font-black tracking-tighter text-lg leading-none uppercase">BMT ADZKIA</span>
                    <span className="text-[8px] font-bold text-sky-200 uppercase tracking-widest mt-0.5">Al - Hidayah Cisadap</span>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <button
                  aria-label="Ciutkan sidebar"
                  className="hidden lg:flex p-1.5 hover:bg-sky-500 rounded-lg transition-colors text-sky-200 hover:text-white"
                  onClick={() => toggle(true)}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
            </div>

            {/* Label Peran */}
            {!isCollapsed ? (
              <div className="mt-4 px-2 py-1 bg-yellow-400/10 rounded-md border border-yellow-400/20 w-full">
                <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest text-center">{ROLE_LABEL[role]}</p>
              </div>
            ) : (
              <div className="mt-4 w-8 h-8 rounded-lg border border-sky-400/30 bg-sky-700/40 flex items-center justify-center text-[11px] font-black text-yellow-400 uppercase shadow-inner">
                {ROLE_BADGE[role]}
              </div>
            )}
          </div>

          {/* Tombol Expand Floating */}
          {isCollapsed && (
            <button
              aria-label="Lebarkan sidebar"
              onClick={() => toggle(false)}
              className="hidden lg:flex absolute -right-3 top-20 bg-yellow-400 p-1 rounded-full border-2 border-sky-600 z-[80] hover:bg-yellow-300 transition-all text-sky-900 shadow-lg hover:scale-110 active:scale-95"
            >
              <ChevronRight size={14} strokeWidth={4} />
            </button>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto sidebar-scroll">
            {MENU_UTAMA.map((m) => (
              <NavItem key={m.href} {...m} active={isActive(m)} collapsed={isCollapsed} onClick={closeMobile} />
            ))}

            <div className="my-4 px-3 flex items-center gap-2 opacity-30">
              {!isCollapsed && <span className="text-[9px] font-black uppercase tracking-widest">Reports & Tools</span>}
              <div className="h-px bg-white flex-1" />
            </div>

            {MENU_LAPORAN.map((m) => (
              <NavItem key={m.href} {...m} active={isActive(m)} collapsed={isCollapsed} onClick={closeMobile} />
            ))}

            <div className="pt-4 mt-4 border-t border-sky-400/20">
              <NavItem {...MENU_PENGATURAN} active={isActive(MENU_PENGATURAN)} collapsed={isCollapsed} onClick={closeMobile} />
            </div>

            {role === "admin" && (
              <div className="pt-2">
                <NavItem
                  href="/"
                  label="Ganti Aplikasi"
                  icon={Repeat}
                  active={false}
                  collapsed={isCollapsed}
                  onClick={closeMobile}
                />
              </div>
            )}
          </nav>

          {/* Footer Version */}
          {!isCollapsed && (
            <div className="p-4 border-t border-sky-400/10">
              <div className="flex items-center justify-center gap-2 opacity-40">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[9px] text-sky-100 font-bold uppercase tracking-[0.2em]">Adzkia System v1.0</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function NavItem({ href, label, icon: Icon, active, collapsed, onClick }: Item & { active: boolean; collapsed: boolean; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 font-bold text-[13px] group relative",
        active ? "bg-yellow-400 text-sky-900 shadow-lg shadow-sky-900/20" : "text-sky-50 hover:bg-white/10 hover:translate-x-1",
        collapsed && "justify-center"
      )}
    >
      <span className={cn("shrink-0 transition-transform", active ? "scale-110" : "group-hover:scale-110")}>
        <Icon size={20} />
      </span>
      {!collapsed && <span className="whitespace-nowrap tracking-tight">{label}</span>}

      {/* Indikator aktif di samping (jika tidak collapsed) */}
      {active && !collapsed && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-sky-800" />}
    </Link>
  )
}
