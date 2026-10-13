-- =====================================================================
--  MTs ADZKIA MOBILE  -  Hapus Tabel Lama (Cleanup Database)
--  Jalankan di Supabase > SQL Editor
--  PERINGATAN: Perintah ini akan menghapus data pesantren lama secara permanen.
-- =====================================================================

-- 1. Hapus tabel lama (jika belum di-rename)
drop table if exists public.log_uang_jajan cascade;
drop table if exists public.transaksi_pembayaran_v2 cascade;
drop table if exists public.keuangan_operasional cascade;
drop table if exists public.tarif cascade;
drop table if exists public.santri cascade;

-- 2. Hapus tabel arsip (jika sebelumnya sudah menjalankan rename _legacy)
drop table if exists public.log_uang_jajan_legacy cascade;
drop table if exists public.transaksi_pembayaran_v2_legacy cascade;
drop table if exists public.keuangan_operasional_legacy cascade;
drop table if exists public.tarif_legacy cascade;
drop table if exists public.santri_legacy cascade;
