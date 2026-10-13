-- 1. Tabel Profil Santri
CREATE TABLE public.santri (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_lengkap text NOT NULL,
    nis text UNIQUE,
    jenjang text NOT NULL, -- MTS, MA, TAKHOSUS, PENGABDIAN
    tanggal_masuk date NOT NULL,
    id_dapur text,
    is_pip boolean DEFAULT false,
    status_aktif boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. Tabel Pengaturan Biaya (Referensi Tarif)
-- Gunakan nama yang konsisten: 'dapur_2026', 'syahriah_pesantren_2026', dll
CREATE TABLE public.tarif (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nama text NOT NULL UNIQUE, 
    jumlah bigint NOT NULL DEFAULT 0,
    keterangan text,
    updated_at timestamptz DEFAULT now()
);

-- 3. Tabel Transaksi Pembayaran (Mendukung Cicilan)
CREATE TABLE public.transaksi_pembayaran_v2 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    santri_id uuid REFERENCES public.santri(id) ON DELETE CASCADE,
    kategori text NOT NULL, -- 'dapur', 'pesantren', 'sekolah'
    jumlah_bayar bigint NOT NULL DEFAULT 0,
    bulan integer NOT NULL, -- 1 s/d 12
    tahun integer NOT NULL,
    keterangan text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.tarif (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    komponen text NOT NULL, -- 'dapur', 'pesantren', 'sekolah_mts', 'sekolah_ma'
    angkatan integer NOT NULL, -- 2024, 2025, 2026, dst
    nominal bigint NOT NULL DEFAULT 0,
    keterangan text,
    created_at timestamptz DEFAULT now(),
    -- Pastikan tidak ada duplikat komponen di tahun angkatan yang sama
    UNIQUE(komponen, angkatan)
);

-- Contoh Data Awal (MTS angkatan 2026)
-- 1. Memasukkan Tarif untuk Angkatan sebelum 2026 (Sampel 2025)
INSERT INTO public.tarif (komponen, angkatan, nominal, keterangan)
VALUES 
    ('dapur', 2025, 250000, 'Tarif Dapur angkatan lama'),
    ('pesantren', 2025, 40000, 'Tarif Pesantren angkatan lama'),
    ('sekolah_mts', 2025, 40000, 'Tarif Sekolah MTS angkatan lama'),
    ('sekolah_ma', 2025, 50000, 'Tarif Sekolah MA angkatan lama')
ON CONFLICT (komponen, angkatan) 
DO UPDATE SET nominal = EXCLUDED.nominal;

-- 2. Memasukkan Tarif untuk Angkatan 2026
INSERT INTO public.tarif (komponen, angkatan, nominal, keterangan)
VALUES 
    ('dapur', 2026, 265000, 'Tarif Dapur angkatan 2026'),
    ('pesantren', 2026, 40000, 'Tarif Pesantren angkatan 2026'),
    ('sekolah_mts', 2026, 45000, 'Tarif Sekolah MTS angkatan 2026'),
    ('sekolah_ma', 2026, 55000, 'Tarif Sekolah MA angkatan 2026'),
    ('dapur_takhosus', 2025, 250000, 'Syahriah Dapur khusus Takhosus (Tarif Lama)'),
    ('pesantren_takhosus', 2025, 40000, 'Syahriah Pesantren khusus Takhosus (Tarif Lama)')
ON CONFLICT (komponen, angkatan) 
DO UPDATE SET nominal = EXCLUDED.nominal;