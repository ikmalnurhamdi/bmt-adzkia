"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { fail, toast } from "@/lib/alert"
import { UNIT } from "@/modules/mts/lib/config"
import { TINGKAT_OPTIONS } from "@/modules/mts/lib/constants"
import { hariIni } from "@/lib/format"
import type { Siswa, StatusSiswa } from "@/modules/mts/lib/types"
import { Modal, ui } from "@/modules/mts/components/ui"

interface Props {
  siswa: Siswa | null
  defaultStatus: StatusSiswa
  onClose: () => void
  onSaved: () => void
}

export default function FormSiswa({ siswa, defaultStatus, onClose, onSaved }: Props) {
  const [f, setF] = useState(() => ({
    nama_lengkap: siswa?.nama_lengkap ?? "",
    nis: siswa?.nis ?? "",
    nisn: siswa?.nisn ?? "",
    jenis_kelamin: siswa?.jenis_kelamin ?? "L",
    tingkat: siswa?.tingkat ?? 7,
    kelas: siswa?.kelas ?? "",
    status: siswa?.status ?? defaultStatus,
    tahun_masuk: siswa?.tahun_masuk ?? new Date().getFullYear(),
    tanggal_masuk: siswa?.tanggal_masuk ?? hariIni(),
    tanggal_mulai_tagihan: siswa?.tanggal_mulai_tagihan ?? hariIni(),
    nama_wali: siswa?.nama_wali ?? "",
    hp_wali: siswa?.hp_wali ?? "",
    alamat: siswa?.alamat ?? "",
    asal_sekolah: siswa?.asal_sekolah ?? "",
    catatan: siswa?.catatan ?? "",
  }))
  const [mulaiManual, setMulaiManual] = useState(!!siswa)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((cur) => ({ ...cur, [k]: v }))

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const payload = {
      ...f,
      unit: UNIT,
      nama_lengkap: f.nama_lengkap.trim().toUpperCase(),
      nis: f.nis.trim() || null,
      nisn: f.nisn.trim() || null,
      kelas: f.kelas.trim() || null,
      nama_wali: f.nama_wali.trim() || null,
      hp_wali: f.hp_wali.trim() || null,
      alamat: f.alamat.trim() || null,
      asal_sekolah: f.asal_sekolah.trim() || null,
      catatan: f.catatan.trim() || null,
    }
    const sb = getSupabase()
    const { error } = siswa
      ? await sb.from("siswa").update(payload).eq("id", siswa.id)
      : await sb.from("siswa").insert(payload)
    setBusy(false)
    if (error) return fail(error.code === "23505" ? "NIS sudah dipakai siswa lain." : error)
    toast("Data tersimpan")
    onSaved()
  }

  const isCalon = f.status === "calon"

  return (
    <Modal
      title={siswa ? "Ubah Data Siswa" : isCalon ? "Pendaftaran Calon Siswa" : "Registrasi Siswa"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={ui.btnGhost} onClick={onClose}>Batal</button>
          <button form="form-siswa" disabled={busy} className={ui.btnPrimary}><Save size={14} /> Simpan</button>
        </div>
      }
    >
      <form id="form-siswa" onSubmit={simpan} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={ui.label} htmlFor="s-nama">Nama lengkap</label>
          <input id="s-nama" required autoFocus className={ui.input + " uppercase"} value={f.nama_lengkap} onChange={(e) => set("nama_lengkap", e.target.value)} />
        </div>

        <div>
          <label className={ui.label} htmlFor="s-nis">NIS</label>
          <input id="s-nis" className={ui.input} value={f.nis} onChange={(e) => set("nis", e.target.value)} placeholder={isCalon ? "Diisi setelah diterima" : ""} />
        </div>
        <div>
          <label className={ui.label} htmlFor="s-nisn">NISN</label>
          <input id="s-nisn" className={ui.input} value={f.nisn} onChange={(e) => set("nisn", e.target.value)} />
        </div>

        <div>
          <label className={ui.label} htmlFor="s-jk">Jenis kelamin</label>
          <select id="s-jk" className={ui.input} value={f.jenis_kelamin} onChange={(e) => set("jenis_kelamin", e.target.value as "L" | "P")}>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="s-status">Status</label>
          <select id="s-status" className={ui.input} value={f.status} onChange={(e) => set("status", e.target.value as StatusSiswa)}>
            <option value="calon">Calon siswa (PPDB)</option>
            <option value="aktif">Siswa aktif</option>
            <option value="lulus">Lulus</option>
            <option value="keluar">Keluar / pindah</option>
          </select>
        </div>

        <div>
          <label className={ui.label} htmlFor="s-tingkat">Tingkat</label>
          <select id="s-tingkat" className={ui.input} value={f.tingkat} onChange={(e) => set("tingkat", Number(e.target.value))}>
            {TINGKAT_OPTIONS.map((t) => <option key={t.value} value={t.value}>Kelas {t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="s-kelas">Rombel / kelas</label>
          <input id="s-kelas" className={ui.input + " uppercase"} value={f.kelas} onChange={(e) => set("kelas", e.target.value)} placeholder="mis. 7A" />
        </div>

        <div>
          <label className={ui.label} htmlFor="s-tmasuk">Tahun masuk</label>
          <input id="s-tmasuk" type="number" required className={ui.input} value={f.tahun_masuk} onChange={(e) => set("tahun_masuk", Number(e.target.value))} />
          <p className="text-[9px] text-slate-400 mt-1">Biaya “Sekali” (PPDB) ditagih pada tahun ini.</p>
        </div>
        <div>
          <label className={ui.label} htmlFor="s-tgl">{isCalon ? "Tanggal daftar" : "Tanggal masuk"}</label>
          <input
            id="s-tgl" type="date" required className={ui.input} value={f.tanggal_masuk}
            onChange={(e) => {
              set("tanggal_masuk", e.target.value)
              if (!mulaiManual) set("tanggal_mulai_tagihan", e.target.value)
            }}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={ui.label} htmlFor="s-mulai">Tagihan dihitung mulai</label>
          <input
            id="s-mulai" type="date" required className={ui.input} value={f.tanggal_mulai_tagihan}
            onChange={(e) => { setMulaiManual(true); set("tanggal_mulai_tagihan", e.target.value) }}
          />
          <p className="text-[9px] text-slate-400 mt-1">Bulanan sebelum bulan ini diabaikan (tidak jadi tunggakan).</p>
        </div>

        <div>
          <label className={ui.label} htmlFor="s-wali">Nama wali</label>
          <input id="s-wali" className={ui.input} value={f.nama_wali} onChange={(e) => set("nama_wali", e.target.value)} />
        </div>
        <div>
          <label className={ui.label} htmlFor="s-hp">WhatsApp wali</label>
          <input id="s-hp" inputMode="tel" className={ui.input} value={f.hp_wali} onChange={(e) => set("hp_wali", e.target.value)} placeholder="08xxxxxxxxxx" />
        </div>

        {isCalon && (
          <div className="sm:col-span-2">
            <label className={ui.label} htmlFor="s-asal">Asal sekolah</label>
            <input id="s-asal" className={ui.input} value={f.asal_sekolah} onChange={(e) => set("asal_sekolah", e.target.value)} />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={ui.label} htmlFor="s-alamat">Alamat</label>
          <textarea id="s-alamat" rows={2} className={ui.input + " resize-none"} value={f.alamat} onChange={(e) => set("alamat", e.target.value)} />
        </div>
      </form>
    </Modal>
  )
}
