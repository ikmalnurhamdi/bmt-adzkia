export type TipeTagihan = "sekali" | "bulanan" | "semester" | "tahunan" | "bebas"
export type StatusSiswa = "calon" | "aktif" | "lulus" | "keluar"

export interface TahunAjaran {
  id: string
  tahun: number
  nama: string
  aktif: boolean
}

export interface Kategori {
  id: string
  unit: string
  nama: string
  tipe_tagihan: TipeTagihan
  jatuh_tempo: number[] | null
  untuk_calon: boolean
  urutan: number
  aktif: boolean
}

export interface Tarif {
  id: string
  kategori_id: string
  tahun_ajaran_id: string
  tingkat: number
  nominal: number
}

export interface Siswa {
  id: string
  nis: string | null
  nisn: string | null
  nama_lengkap: string
  jenis_kelamin: "L" | "P" | null
  unit: string
  tingkat: number
  kelas: string | null
  status: StatusSiswa
  tahun_masuk: number
  tanggal_masuk: string
  tanggal_mulai_tagihan: string
  nama_wali: string | null
  hp_wali: string | null
  alamat: string | null
  asal_sekolah: string | null
  catatan: string | null
}

export type SiswaRingkas = Pick<Siswa, "id" | "nama_lengkap" | "nis" | "tingkat" | "kelas" | "status" | "nama_wali" | "hp_wali">

export interface Diskon {
  id: string
  siswa_id: string
  kategori_id: string | null
  tahun_ajaran_id: string | null
  tipe: "persen" | "nominal"
  nilai: number
  keterangan: string | null
}

export interface Transaksi {
  id: string
  siswa_id: string
  kategori_id: string
  tahun_ajaran_id: string
  periode: number
  jumlah_bayar: number
  tanggal_bayar: string
  metode: string
  no_kwitansi: string | null
  keterangan: string | null
  created_at: string
}

export interface TransaksiRow extends Transaksi {
  siswa: Pick<Siswa, "nama_lengkap" | "nis" | "kelas" | "tingkat"> | null
  kategori: Pick<Kategori, "nama" | "tipe_tagihan"> | null
}

export interface TagihanRow {
  siswa_id: string
  kategori_id: string
  periode: number
  jatuh_tempo_bulan: number
  tarif: number
  diskon: number
  target: number
  bayar: number
  sisa: number
  jatuh_tempo: boolean
}

export interface TunggakanRow {
  siswa_id: string
  nama_lengkap: string
  nis: string | null
  tingkat: number
  kelas: string | null
  status: StatusSiswa
  nama_wali: string | null
  hp_wali: string | null
  total_sisa: number
  rincian: { kategori_id: string; nama: string; jumlah_periode: number; sisa: number }[]
}

export interface Ringkasan {
  siswa_aktif: number
  calon: number
  pemasukan: number
  tagihan: number
  tunggakan: number
  kategori: { id: string; nama: string; tagihan: number; bayar: number; tunggakan: number }[]
  per_bulan: { bulan: number; total: number }[]
  kas_masuk: number
  kas_keluar: number
}

export interface RekapKategori {
  kategori_id: string
  nama: string
  jumlah: number
  total: number
}

export interface Kas {
  id: string
  tanggal: string
  jenis: "pemasukan" | "pengeluaran"
  nominal: number
  keterangan: string
}
