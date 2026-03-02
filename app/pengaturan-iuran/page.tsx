"use client"

import PengaturanTarif from "@/components/PengaturanTarif"

export default function PengaturanIuranPage() {
  return (
    <div className="p-4 lg:p-8 animate-in fade-in duration-500">
      {/* Judul Halaman */}
      <div className="mb-8 max-w-2xl">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
          Manajemen Parameter Biaya
        </h2>
      </div>

      {/* Memanggil Komponen Inti PengaturanTarif */}
      <PengaturanTarif onUpdate={() => console.log("Tarif updated!")} />
    </div>
  )
}