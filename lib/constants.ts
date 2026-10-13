import type { TipeTagihan } from "./types"

export const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

export const TINGKAT_OPTIONS = [
  { value: 7, label: "VII" },
  { value: 8, label: "VIII" },
  { value: 9, label: "IX" },
]

export const tingkatLabel = (t: number) => TINGKAT_OPTIONS.find((o) => o.value === t)?.label ?? String(t)

export const TIPE_TAGIHAN: { value: TipeTagihan; label: string; hint: string }[] = [
  { value: "sekali", label: "Sekali (per siswa)", hint: "Dibayar 1× saat masuk, contoh: PPDB" },
  { value: "bulanan", label: "Bulanan", hint: "12 periode, Januari–Desember" },
  { value: "semester", label: "Semester (ASAS/ASAT)", hint: "2 periode: ASAS & ASAT" },
  { value: "tahunan", label: "Tahunan", hint: "1× per tahun ajaran, contoh: biaya akhir tahun" },
  { value: "bebas", label: "Bebas (tanpa target)", hint: "Nominal bebas, tidak masuk tunggakan" },
]

export const tipeLabel = (t: TipeTagihan) => TIPE_TAGIHAN.find((x) => x.value === t)?.label ?? t

const SEMESTER_LABEL = ["ASAS", "ASAT"]

/** Label periode sesuai tipe tagihan. */
export function labelPeriode(tipe: TipeTagihan, periode: number): string {
  switch (tipe) {
    case "bulanan": return BULAN_NAMES[periode - 1] ?? String(periode)
    case "semester": return SEMESTER_LABEL[periode - 1] ?? `Semester ${periode}`
    case "sekali": return "Sekali"
    case "tahunan": return "Tahunan"
    default: return "-"
  }
}

export const METODE_BAYAR = ["tunai", "transfer"]