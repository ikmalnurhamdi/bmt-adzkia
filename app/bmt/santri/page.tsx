"use client"

import ManajemenSantri from "@/modules/bmt/components/ManajemenSantri"

export default function SantriPage() {
  return (
    <div className="p-4 lg:p-8">
      {/* Konten Utama langsung dipanggil tanpa pembungkus layout lagi */}
      <ManajemenSantri onUpdate={() => {}} />
    </div>
  )
}