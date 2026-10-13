const rupiahFmt = new Intl.NumberFormat("id-ID")

export const rupiah = (n: number | null | undefined) => `Rp ${rupiahFmt.format(n || 0)}`
export const angka = (n: number | null | undefined) => rupiahFmt.format(n || 0)

const tglFmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" })

export const tanggal = (s: string | null | undefined) => {
  if (!s) return "-"
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? "-" : tglFmt.format(d)
}

/** yyyy-mm-dd menurut zona waktu lokal (bukan UTC). */
export const hariIni = () => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

/** Rentang tanggal [awal, akhirEksklusif) untuk satu tahun / satu bulan. */
export function rentangTanggal(tahun: number, bulan?: number | null) {
  if (!bulan) return { awal: `${tahun}-01-01`, akhir: `${tahun + 1}-01-01` }
  const m = String(bulan).padStart(2, "0")
  const next = bulan === 12 ? `${tahun + 1}-01-01` : `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`
  return { awal: `${tahun}-${m}-01`, akhir: next }
}

/** Normalisasi nomor HP Indonesia ke format wa.me (62xxxx). */
export const nomorWA = (hp: string | null | undefined) => {
  const d = (hp || "").replace(/\D/g, "")
  if (!d) return ""
  if (d.startsWith("62")) return d
  if (d.startsWith("0")) return `62${d.slice(1)}`
  return `62${d}`
}

export const buatNoKwitansi = () => {
  const t = hariIni().replace(/-/g, "")
  const r = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `KW-${t}-${r}`
}
