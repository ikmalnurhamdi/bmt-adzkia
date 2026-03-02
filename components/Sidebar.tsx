"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { 
  LayoutDashboard, Users, Wallet, 
  Settings2, ChevronLeft, ChevronRight, AlertCircle, Utensils, Coins, BarChart3, X 
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpenMobile, setIsOpenMobile }: SidebarProps) {
  const [mounted, setMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()

  // 1. Inisialisasi status dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setIsCollapsed(true);
    setMounted(true);
  }, []);

  // 2. Simpan status ke localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-collapsed", isCollapsed.toString());
    }
  }, [isCollapsed, mounted]);

  // Navigasi Mulus tanpa kedip
  const navigateTo = (tab: string, path: string) => {
    setActiveTab(tab);
    if (isOpenMobile) setIsOpenMobile(false);
    
    // Gunakan push untuk navigasi internal SPA
    router.push(path);
  };

  // 3. Skeleton Sidebar saat Hydration untuk mencegah Layout Shift
  if (!mounted) {
    return <aside className="fixed lg:sticky top-0 left-0 z-50 h-screen bg-sky-600 w-64 border-r border-sky-500/30" /> 
  }

  return (
    <>
      {/* Overlay Mobile dengan Transisi Lembut */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60] lg:hidden backdrop-blur-sm transition-opacity duration-300" 
          onClick={() => setIsOpenMobile(false)} 
        />
      )}

      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-[70] h-screen bg-sky-600 text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl border-r border-sky-500/30",
        isCollapsed ? 'w-17' : 'w-59',
        isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Dekorasi Grid Halus */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header Sidebar */}
          <div className={cn(
            "py-6 px-4 flex flex-col border-b border-sky-400/20 transition-all",
            isCollapsed ? 'items-center' : 'items-start'
          )}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-xl shrink-0 flex items-center justify-center shadow-lg shadow-sky-900/20">
                  <Image src="/logo.png" alt="Logo" width={24} height={24} className="object-contain" />
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="font-black tracking-tighter text-lg leading-none uppercase">
                      BMT ADZKIA
                    </span>
                    <span className="text-[8px] font-bold text-sky-200 uppercase tracking-widest mt-0.5">Al - Hidayah Cisadap</span>
                  </div>
                )}
              </div>
              
              {!isCollapsed && (
                <button 
                  className="hidden lg:flex p-1.5 hover:bg-sky-500 rounded-lg transition-colors text-sky-200 hover:text-white" 
                  onClick={() => setIsCollapsed(true)}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
            </div>

            {/* Role Label */}
            {!isCollapsed ? (
              <div className="mt-4 px-2 py-1 bg-yellow-400/10 rounded-md border border-yellow-400/20 w-full">
                <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest text-center">
                  Administrator
                </p>
              </div>
            ) : (
              <div className="mt-4 w-8 h-8 rounded-lg border border-sky-400/30 bg-sky-700/40 flex items-center justify-center text-[11px] font-black text-yellow-400 uppercase shadow-inner">
                AD
              </div>
            )}
          </div>

          {/* Tombol Expand Floating */}
          {isCollapsed && (
            <button 
              onClick={() => setIsCollapsed(false)} 
              className="hidden lg:flex absolute -right-3 top-20 bg-yellow-400 p-1 rounded-full border-2 border-sky-600 z-[80] hover:bg-yellow-300 transition-all text-sky-900 shadow-lg hover:scale-110 active:scale-95"
            >
              <ChevronRight size={14} strokeWidth={4} />
            </button>
          )}
          
          {/* Navigation Menu */}
          <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto custom-scrollbar">
            <NavItem 
              icon={<LayoutDashboard size={20}/>} 
              label="Dashboard" 
              active={activeTab === "overview"} 
              collapsed={isCollapsed} 
              onClick={() => navigateTo("overview", "/")} 
            />
            <NavItem 
              icon={<Users size={20}/>} 
              label="Data Santri" 
              active={activeTab === "santri"} 
              collapsed={isCollapsed} 
              onClick={() => navigateTo("santri", "/santri")} 
            />
            <NavItem 
              icon={<Wallet size={20}/>} 
              label="Transaksi" 
              active={activeTab === "transaksi"} 
              collapsed={isCollapsed} 
              onClick={() => navigateTo("transaksi", "/transaksi")} 
            />

            <div className="my-4 px-3 flex items-center gap-2 opacity-30">
               {!isCollapsed && <span className="text-[9px] font-black uppercase tracking-widest">Reports & Tools</span>}
               <div className="h-px bg-white flex-1"></div>
            </div>

            <NavItem 
              icon={<Utensils size={20}/>} 
              label="Laporan DPU" 
              active={activeTab === "dashboard-dpu"} 
              collapsed={isCollapsed} 
              onClick={() => navigateTo("dpu", "/dashboard-dpu")} 
            />
            <NavItem 
              icon={<Coins size={20}/>} 
              label="Uang Saku" 
              active={activeTab === "uang-jajan"} 
              collapsed={isCollapsed} 
              onClick={() => navigateTo("uang-jajan", "/uang-jajan")} 
            />
            <NavItem 
              icon={<AlertCircle size={20}/>} 
              label="Tunggakan" 
              active={activeTab === "tunggakan"} 
              collapsed={isCollapsed} 
              onClick={() => navigateTo("tunggakan", "/tunggakan")} 
            />
            <NavItem 
              icon={<BarChart3 size={20}/>} 
              label="Laporan Keuangan" 
              active={activeTab === "laporan-keuangan"} 
              collapsed={isCollapsed} 
              onClick={() => navigateTo("keuangan", "/laporan-keuangan")} 
            />
            
            <div className="pt-4 mt-4 border-t border-sky-400/20">
              <NavItem 
                icon={<Settings2 size={20}/>} 
                label="Pengaturan Biaya" 
                active={activeTab === "pengaturan-iuran"} 
                collapsed={isCollapsed} 
                onClick={() => navigateTo("pengaturan-iuran", "/pengaturan-iuran")} 
              />
            </div>
          </nav>

          {/* Footer Version */}
          {!isCollapsed && (
            <div className="p-4 border-t border-sky-400/10">
              <div className="flex items-center justify-center gap-2 opacity-40">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <p className="text-[9px] text-sky-100 font-bold uppercase tracking-[0.2em]">Adzkia System v1.0</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </>
  )
}

function NavItem({ icon, label, active, collapsed, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      title={collapsed ? label : ""}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 font-bold text-[13px] group relative",
        active 
          ? 'bg-yellow-400 text-sky-900 shadow-lg shadow-sky-900/20' 
          : 'text-sky-50 hover:bg-white/10 hover:translate-x-1',
        collapsed ? 'justify-center' : ''
      )}
    >
      <span className={cn("shrink-0 transition-transform", active ? 'scale-110' : 'group-hover:scale-110')}>
        {icon}
      </span>
      {!collapsed && <span className="whitespace-nowrap tracking-tight">{label}</span>}
      
      {/* Indikator Aktif di samping (jika tidak collapsed) */}
      {active && !collapsed && (
        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-sky-800 animate-in fade-in zoom-in duration-300"></div>
      )}
    </button>
  )
}