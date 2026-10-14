/** Identitas platform bersama (halaman login, pemilih aplikasi, metadata dasar). */
export const PLATFORM_NAME = "APLIKASI TERPADU ADZKIA"
export const PLATFORM_TAGLINE = "Sistem Keuangan Terpadu"
export const PLATFORM_DESC = "Sistem keuangan terpadu BMT ADZKIA dan MTs ADZKIA MOBILE"
export const DEVELOPER = "NurhaDev"

/** Daftar aplikasi dalam platform (dipakai pemilih aplikasi & sidebar admin). */
export const APP_META = {
  bmt: {
    name: "BMT ADZKIA",
    desc: "Keuangan Pesantren Al-Hidayah Cisadap · syahriah, uang saku, laporan DPU",
    href: "/bmt",
  },
  mts: {
    name: "MTs ADZKIA MOBILE",
    desc: "Rekap keuangan sekolah MTs · PPDB, bulanan, ASAS/ASAT, akhir tahun",
    href: "/mts",
  },
} as const
