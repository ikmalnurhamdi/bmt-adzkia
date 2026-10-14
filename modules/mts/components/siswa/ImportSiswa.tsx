"use client"

import { useState } from "react"
import { Download, Upload } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { fail, toast, warn } from "@/lib/alert"
import { UNIT } from "@/modules/mts/lib/config"
import { hariIni } from "@/lib/format"
import type { StatusSiswa } from "@/modules/mts/lib/types"
import { Modal, ui } from "@/modules/mts/components/ui"

const HEADERS = ["nama_lengkap", "nis", "nisn", "jenis_kelamin", "tingkat", "kelas", "nama_wali", "hp_wali", "alamat"]

type Baris = Record<string, unknown>

/** Ambil nilai dari baris Excel dengan beberapa kemungkinan nama kolom. */
const ambil = (row: Baris, ...names: string[]) => {
  for (const key of Object.keys(row)) {
    const k = key.toLowerCase().replace(/[\s_]/g, "")
    if (names.some((n) => n.replace(/[\s_]/g, "") === k)) {
      const v = row[key]
      return v === undefined || v === null ? "" : String(v).trim()
    }
  }
  return ""
}

export default function ImportSiswa({ defaultStatus, onClose, onDone }: { defaultStatus: StatusSiswa; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<StatusSiswa>(defaultStatus)
  const [tahunMasuk, setTahunMasuk] = useState(new Date().getFullYear())
  const [busy, setBusy] = useState(false)

  const unduhTemplate = async () => {
    const XLSX = await import("xlsx")
    const ws = XLSX.utils.aoa_to_sheet([
      HEADERS,
      ["AHMAD FAUZI", "1001", "0123456789", "L", 7, "7A", "BAPAK FAUZI", "081234567890", "Jl. Contoh No. 1"],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Siswa")
    XLSX.writeFile(wb, "template_impor_siswa.xlsx")
  }

  const proses = async (file: File) => {
    setBusy(true)
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.read(await file.arrayBuffer())
      const rows = XLSX.utils.sheet_to_json<Baris>(wb.Sheets[wb.SheetNames[0]], { defval: "" })

      const data = rows
        .map((r) => {
          const nama = ambil(r, "nama_lengkap", "nama")
          if (!nama) return null
          const jk = ambil(r, "jenis_kelamin", "jk").toUpperCase().charAt(0)
          const tingkat = Number(ambil(r, "tingkat", "kelas_tingkat")) || 7
          return {
            unit: UNIT,
            nama_lengkap: nama.toUpperCase(),
            nis: ambil(r, "nis") || null,
            nisn: ambil(r, "nisn") || null,
            jenis_kelamin: jk === "P" ? "P" : jk === "L" ? "L" : null,
            tingkat: tingkat >= 1 && tingkat <= 12 ? tingkat : 7,
            kelas: ambil(r, "kelas", "rombel") || null,
            nama_wali: ambil(r, "nama_wali", "wali") || null,
            hp_wali: ambil(r, "hp_wali", "hp", "whatsapp") || null,
            alamat: ambil(r, "alamat") || null,
            status,
            tahun_masuk: tahunMasuk,
            tanggal_masuk: hariIni(),
            tanggal_mulai_tagihan: hariIni(),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      if (data.length === 0) return warn("Tidak ada data", "Pastikan kolom nama_lengkap terisi.")

      const sb = getSupabase()
      for (let i = 0; i < data.length; i += 200) {
        const { error } = await sb.from("siswa").insert(data.slice(i, i + 200))
        if (error) throw new Error(error.code === "23505" ? "Ada NIS ganda (di file atau sudah terdaftar). Tidak ada data yang diimpor pada batch ini." : error.message)
      }
      toast(`${data.length} siswa berhasil diimpor`)
      onDone()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Impor Siswa dari Excel" onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-4 text-xs text-slate-600">
        <p>
          Kolom yang dibaca: <code className="bg-slate-100 px-1 rounded">{HEADERS.join(", ")}</code>. Hanya <b>nama_lengkap</b> yang wajib.
        </p>
        <button className={ui.btnGhost} onClick={unduhTemplate}><Download size={14} /> Unduh template</button>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={ui.label}>Status awal</label>
            <select className={ui.input} value={status} onChange={(e) => setStatus(e.target.value as StatusSiswa)}>
              <option value="aktif">Siswa aktif</option>
              <option value="calon">Calon siswa</option>
            </select>
          </div>
          <div>
            <label className={ui.label}>Tahun masuk</label>
            <input type="number" className={ui.input} value={tahunMasuk} onChange={(e) => setTahunMasuk(Number(e.target.value))} />
          </div>
        </div>

        <label className={`${ui.btnPrimary} w-full cursor-pointer ${busy ? "opacity-50 pointer-events-none" : ""}`}>
          <Upload size={14} /> {busy ? "Memproses..." : "Pilih file Excel & impor"}
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && proses(e.target.files[0])} />
        </label>
      </div>
    </Modal>
  )
}
