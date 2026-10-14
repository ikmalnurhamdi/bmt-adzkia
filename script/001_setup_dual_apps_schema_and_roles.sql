-- =====================================================================
--  AMANAH ADZKIA - SETUP DATABASE GABUNGAN BMT & MTs
--  Menyediakan skema database lengkap untuk:
--    1. BMT ADZKIA (santri, transaksi_pembayaran_v2, tarif, log_uang_jajan, keuangan_operasional)
--    2. MTs ADZKIA MOBILE (siswa, transaksi_pembayaran, tarif_pembayaran, dll)
--    3. Konfigurasi Hak Akses (Role-Based Access Control: admin, bmt, mts)
--
--  Jalankan di Supabase > SQL Editor
-- =====================================================================

-- =====================================================================
-- BAGIAN 1: TABEL-TABEL BMT ADZKIA (SKEMA ASLI)
-- =====================================================================

-- 1.1 Tabel Santri BMT
CREATE TABLE IF NOT EXISTS public.santri (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_lengkap text NOT NULL,
  nis text UNIQUE,
  jenjang text NOT NULL, -- MTS PLUS, MA PLUS, TAKHOSUS, PENGABDIAN, dll
  tanggal_masuk date NOT NULL DEFAULT current_date,
  tanggal_mulai_tagihan date,
  id_dapur text,
  jenis_kelamin text,
  kelas text,
  nama_wali text,
  hp_wali text,
  alamat text,
  saldo_jajan bigint DEFAULT 0,
  is_pip boolean DEFAULT false,
  status_aktif boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT santri_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_santri_status ON public.santri (status_aktif, nama_lengkap);

-- 1.2 Tabel Transaksi Pembayaran BMT (v2)
CREATE TABLE IF NOT EXISTS public.transaksi_pembayaran_v2 (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  santri_id uuid,
  kategori text NOT NULL, -- dapur, pesantren, sekolah
  bulan integer NOT NULL, -- 1 s/d 12
  tahun integer NOT NULL,
  jumlah_bayar bigint NOT NULL DEFAULT 0,
  keterangan text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transaksi_pembayaran_v2_pkey PRIMARY KEY (id),
  CONSTRAINT transaksi_pembayaran_v2_santri_id_fkey FOREIGN KEY (santri_id) REFERENCES public.santri(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_bmt_trx ON public.transaksi_pembayaran_v2 (santri_id, tahun, bulan);

-- 1.3 Tabel Tarif BMT (Referensi Komponen Biaya)
CREATE TABLE IF NOT EXISTS public.tarif (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  komponen text NOT NULL,
  angkatan integer NOT NULL,
  nominal bigint NOT NULL DEFAULT 0,
  keterangan text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tarif_pkey PRIMARY KEY (id),
  CONSTRAINT tarif_komponen_angkatan_key UNIQUE (komponen, angkatan)
);

-- 1.4 Tabel Log Uang Jajan BMT
CREATE TABLE IF NOT EXISTS public.log_uang_jajan (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  santri_id uuid,
  tipe text NOT NULL, -- MASUK / KELUAR
  nominal bigint NOT NULL,
  saldo_akhir bigint NOT NULL,
  keterangan text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT log_uang_jajan_pkey PRIMARY KEY (id),
  CONSTRAINT log_uang_jajan_santri_id_fkey FOREIGN KEY (santri_id) REFERENCES public.santri(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_log_jajan_santri ON public.log_uang_jajan (santri_id, created_at DESC);

-- 1.5 Tabel Keuangan Operasional BMT
CREATE TABLE IF NOT EXISTS public.keuangan_operasional (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tanggal date NOT NULL DEFAULT current_date,
  jenis text NOT NULL CHECK (jenis = ANY (ARRAY['pemasukan'::text, 'pengeluaran'::text])),
  nominal bigint NOT NULL,
  keterangan text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT keuangan_operasional_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_bmt_ops_tgl ON public.keuangan_operasional (tanggal DESC);

-- =====================================================================
-- DATA AWAL TARIF BMT (Angkatan 2026 & Lama)
-- =====================================================================
INSERT INTO public.tarif (komponen, angkatan, nominal, keterangan)
VALUES 
    ('dapur_mts', 2026, 265000, 'Tarif Dapur MTs Plus 2026'),
    ('pesantren_mts', 2026, 40000, 'Tarif Pesantren MTs Plus 2026'),
    ('sekolah_mts', 2026, 45000, 'Tarif Sekolah MTs Plus 2026'),
    ('dapur_mts_revisi', 2026, 265000, 'Tarif Dapur MTs Plus Revisi 2026'),
    ('pesantren_mts_revisi', 2026, 40000, 'Tarif Pesantren MTs Plus Revisi 2026'),
    ('sekolah_mts_revisi', 2026, 45000, 'Tarif Sekolah MTs Plus Revisi 2026'),
    ('dapur_ma', 2026, 265000, 'Tarif Dapur MA Plus 2026'),
    ('pesantren_ma', 2026, 40000, 'Tarif Pesantren MA Plus 2026'),
    ('sekolah_ma', 2026, 55000, 'Tarif Sekolah MA Plus 2026'),
    ('dapur_ma_revisi', 2026, 265000, 'Tarif Dapur MA Plus Revisi 2026'),
    ('pesantren_ma_revisi', 2026, 40000, 'Tarif Pesantren MA Plus Revisi 2026'),
    ('sekolah_ma_revisi', 2026, 55000, 'Tarif Sekolah MA Plus Revisi 2026'),
    ('dapur_takhosus', 2026, 265000, 'Tarif Dapur Takhosus 2026'),
    ('pesantren_takhosus', 2026, 40000, 'Tarif Pesantren Takhosus 2026'),
    ('pesantren_pengabdian', 2026, 40000, 'Tarif Pengabdian 2026')
ON CONFLICT (komponen, angkatan) 
DO UPDATE SET nominal = EXCLUDED.nominal;

-- =====================================================================
-- BAGIAN 2: ROW LEVEL SECURITY & HAK AKSES PERAN (BMT vs MTs)
-- =====================================================================

-- Fungsi helper untuk membaca role dari JWT user saat ini
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'admin' -- Default jika role belum diisi agar admin awal tidak terkunci
  );
$$;

-- 2.1 RLS Tabel-tabel BMT (Akses untuk peran 'bmt' dan 'admin')
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'santri', 'transaksi_pembayaran_v2', 'tarif', 'log_uang_jajan', 'keuangan_operasional'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "bmt_policy" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "bmt_policy" ON public.%I FOR ALL TO authenticated USING (
        public.current_app_role() IN (''admin'', ''bmt'')
      ) WITH CHECK (
        public.current_app_role() IN (''admin'', ''bmt'')
      )', t
    );
  END LOOP;
END $$;

-- 2.2 RLS Tabel-tabel MTs (Akses untuk peran 'mts' dan 'admin')
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tahun_ajaran', 'kategori_pembayaran', 'tarif_pembayaran', 'siswa',
    'diskon_siswa', 'transaksi_pembayaran', 'kas_operasional'
  ] LOOP
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "mts_policy" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "mts_policy" ON public.%I FOR ALL TO authenticated USING (
          public.current_app_role() IN (''admin'', ''mts'')
        ) WITH CHECK (
          public.current_app_role() IN (''admin'', ''mts'')
        )', t
      );
    END IF;
  END LOOP;
END $$;

-- =====================================================================
-- BAGIAN 3: PANDUAN PEMBERIAN HAK AKSES PENGURUS (JALANKAN SESUAI KEBUTUHAN)
-- =====================================================================

/*
-- 1. Lihat daftar user yang sudah terdaftar di Supabase Auth:
SELECT id, email, raw_app_meta_data FROM auth.users;

-- 2. Berikan akses Super Admin (bisa buka BMT dan MTs sekaligus):
UPDATE auth.users 
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'nurhamdiikmal6@gmail.com';

-- 3. Berikan akses khusus Pengurus BMT ADZKIA saja:
-- UPDATE auth.users 
-- SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "bmt"}'::jsonb
-- WHERE email = 'email_pengurus_bmt@gmail.com';

-- 4. Berikan akses khusus Pengurus MTs ADZKIA MOBILE saja:
-- UPDATE auth.users 
-- SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "mts"}'::jsonb
-- WHERE email = 'email_pengurus_mts@gmail.com';
*/
