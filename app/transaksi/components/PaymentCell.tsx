"use client"

import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getTargetDinamis } from "../utils/transactionHelpers"

interface PaymentCellProps {
  santri: any
  jenis: string
  pembayaranList: any[]
  masterTarif: any[]
  onDeleteSingleTrx: (id: string) => void
}

export default function PaymentCell({ santri, jenis, pembayaranList, masterTarif, onDeleteSingleTrx }: PaymentCellProps) {
  const target = getTargetDinamis(santri, jenis, masterTarif)
  const trxInCell = pembayaranList.filter(p => p.santri_id === santri.id && p.kategori === jenis)
  const totalTerbayar = trxInCell.reduce((a, b) => a + b.jumlah_bayar, 0)
  const isLunas = target === 0 || (target > 0 && totalTerbayar >= target)

  if (target === 0 && trxInCell.length === 0) return <span className="text-slate-200 text-xs">—</span>

  return (
    <div className="flex flex-col gap-1 items-center justify-center min-h-[48px] py-1">
      <div className="flex flex-wrap gap-1 justify-center">
        {trxInCell.map(t => (
          <div key={t.id} className="group relative">
            <div className={cn(
              "px-2 py-1 rounded-md text-[10px] font-bold border cursor-help transition-all",
              isLunas
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 group-hover:border-emerald-400"
                : "bg-orange-50 border-orange-200 text-orange-700 group-hover:border-orange-400"
            )}>
              {t.jumlah_bayar.toLocaleString()}
            </div>
            <div className="hidden group-hover:flex absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] py-1.5 px-2 rounded-lg z-50 shadow-xl items-center gap-2 whitespace-nowrap">
              <span>{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
              <button onClick={() => onDeleteSingleTrx(t.id)} className="text-red-400 hover:text-red-200 ml-1">
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {isLunas && target > 0 ? (
        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Lunas</span>
      ) : target > 0 && (
        <span className="text-[9px] font-semibold text-orange-500">Kurang {(target - totalTerbayar).toLocaleString()}</span>
      )}
    </div>
  )
}