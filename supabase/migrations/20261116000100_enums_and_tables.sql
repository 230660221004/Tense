-- =====================================================================
-- Sistem Arsip Poin Pelanggaran — 001 enums & tables
-- Sumber kebenaran domain: PRD bagian 11.
-- Enum di bawah TIDAK tersedia di schema sumber (tertulis USER-DEFINED).
-- Nilai default yang tampak di schema ('aktif', 'usulan',
-- 'menunggu_persetujuan', 'direncanakan', 'draft') dipertahankan persis.
-- Nilai lain adalah ASUMSI terdokumentasi di docs/data-model-notes.md.
-- Migration idempotent: aman dijalankan ulang pada DB yang belum punya objek ini.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

do $$ begin
  create type public.user_role as enum ('admin','bk','kepala_sekolah','guru','siswa','orang_tua');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_siswa as enum ('aktif','nonaktif','lulus','pindah','dikeluarkan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.jalur_pelanggaran as enum ('usulan','langsung');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_pelanggaran as enum ('menunggu_persetujuan','disetujui','disahkan','ditolak','dibatalkan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.jenis_sanksi as enum ('pembinaan','teguran_tertulis','panggilan_orang_tua','skorsing','dikembalikan_ke_orang_tua');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_tindak_lanjut as enum ('direncanakan','berjalan','selesai','dibatalkan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.jenis_dokumen as enum ('bukti_pelanggaran','surat_pernyataan','surat_remisi','surat_keluar','lainnya');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.jenis_surat as enum ('panggilan_orang_tua','peringatan','skorsing','pernyataan_siswa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_surat as enum ('draft','final','dibatalkan');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
create table if not exists public.tahun_ajaran (
  id uuid not null default gen_random_uuid(),
  nama text not null unique,
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  aktif boolean not null default false,
  created_at timestamptz not null default now(),
  constraint tahun_ajaran_pkey primary key (id),
  constraint tahun_ajaran_rentang_check check (tanggal_selesai > tanggal_mulai)
);

create table if not exists public.profiles (
  id uuid not null,
  nama_lengkap text not null,
  role public.user_role not null,
  no_hp text,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade
);

create table if not exists public.kelas (
  id uuid not null default gen_random_uuid(),
  tahun_ajaran_id uuid not null,
  nama text not null,
  tingkat smallint not null check (tingkat = any (array[10, 11, 12])),
  wali_kelas_id uuid,
  created_at timestamptz not null default now(),
  constraint kelas_pkey primary key (id),
  constraint kelas_tahun_ajaran_id_fkey foreign key (tahun_ajaran_id) references public.tahun_ajaran(id),
  constraint kelas_wali_kelas_id_fkey foreign key (wali_kelas_id) references public.profiles(id),
  constraint kelas_nama_per_tahun_unique unique (tahun_ajaran_id, nama)
);

create table if not exists public.siswa (
  id uuid not null default gen_random_uuid(),
  profile_id uuid unique,
  nis text not null unique,
  nisn text unique,
  nama_lengkap text not null,
  jenis_kelamin character(1) check (jenis_kelamin = any (array['L'::bpchar, 'P'::bpchar])),
  kelas_id uuid,
  status public.status_siswa not null default 'aktif'::public.status_siswa,
  nama_orang_tua text,
  alamat text,
  no_hp_orang_tua text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint siswa_pkey primary key (id),
  constraint siswa_profile_id_fkey foreign key (profile_id) references public.profiles(id),
  constraint siswa_kelas_id_fkey foreign key (kelas_id) references public.kelas(id)
);

create table if not exists public.orang_tua_siswa (
  id uuid not null default gen_random_uuid(),
  orang_tua_id uuid not null,
  siswa_id uuid not null,
  hubungan text not null default 'orang tua'::text,
  created_at timestamptz not null default now(),
  constraint orang_tua_siswa_pkey primary key (id),
  constraint orang_tua_siswa_orang_tua_id_fkey foreign key (orang_tua_id) references public.profiles(id),
  constraint orang_tua_siswa_siswa_id_fkey foreign key (siswa_id) references public.siswa(id),
  constraint orang_tua_siswa_unique unique (orang_tua_id, siswa_id)
);

create table if not exists public.jenis_pelanggaran (
  id uuid not null default gen_random_uuid(),
  pasal smallint not null,
  kode text not null unique,
  nama text not null,
  deskripsi text,
  bobot_poin smallint not null check (bobot_poin >= 0),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jenis_pelanggaran_pkey primary key (id)
);

create table if not exists public.tingkat_sanksi (
  id uuid not null default gen_random_uuid(),
  nama text not null,
  jenis public.jenis_sanksi not null,
  ambang_poin smallint not null check (ambang_poin > 0),
  deskripsi text,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  constraint tingkat_sanksi_pkey primary key (id)
);

create table if not exists public.pelanggaran (
  id uuid not null default gen_random_uuid(),
  siswa_id uuid not null,
  kelas_id uuid,
  tahun_ajaran_id uuid,
  jenis_pelanggaran_id uuid not null,
  poin smallint not null check (poin >= 0),
  tanggal_kejadian date not null default current_date,
  deskripsi text,
  jalur public.jalur_pelanggaran not null default 'usulan'::public.jalur_pelanggaran,
  status public.status_pelanggaran not null default 'menunggu_persetujuan'::public.status_pelanggaran,
  pengusul_id uuid not null,
  diputuskan_oleh uuid,
  diputuskan_pada timestamptz,
  catatan_keputusan text,
  disahkan_pada timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pelanggaran_pkey primary key (id),
  constraint pelanggaran_siswa_id_fkey foreign key (siswa_id) references public.siswa(id),
  constraint pelanggaran_kelas_id_fkey foreign key (kelas_id) references public.kelas(id),
  constraint pelanggaran_tahun_ajaran_id_fkey foreign key (tahun_ajaran_id) references public.tahun_ajaran(id),
  constraint pelanggaran_jenis_pelanggaran_id_fkey foreign key (jenis_pelanggaran_id) references public.jenis_pelanggaran(id),
  constraint pelanggaran_pengusul_id_fkey foreign key (pengusul_id) references public.profiles(id),
  constraint pelanggaran_diputuskan_oleh_fkey foreign key (diputuskan_oleh) references public.profiles(id)
);

create table if not exists public.pelanggaran_status_log (
  id bigint generated always as identity not null,
  pelanggaran_id uuid not null,
  status_dari public.status_pelanggaran,
  status_ke public.status_pelanggaran not null,
  oleh uuid,
  catatan text,
  created_at timestamptz not null default now(),
  constraint pelanggaran_status_log_pkey primary key (id),
  constraint pelanggaran_status_log_pelanggaran_id_fkey foreign key (pelanggaran_id) references public.pelanggaran(id),
  constraint pelanggaran_status_log_oleh_fkey foreign key (oleh) references public.profiles(id)
);

create table if not exists public.tindak_lanjut (
  id uuid not null default gen_random_uuid(),
  siswa_id uuid not null,
  tingkat_sanksi_id uuid,
  jenis public.jenis_sanksi not null,
  tanggal date not null default current_date,
  tanggal_selesai date,
  keterangan text,
  status public.status_tindak_lanjut not null default 'direncanakan'::public.status_tindak_lanjut,
  total_poin_saat_dibuat integer,
  dibuat_oleh uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tindak_lanjut_pkey primary key (id),
  constraint tindak_lanjut_siswa_id_fkey foreign key (siswa_id) references public.siswa(id),
  constraint tindak_lanjut_tingkat_sanksi_id_fkey foreign key (tingkat_sanksi_id) references public.tingkat_sanksi(id),
  constraint tindak_lanjut_dibuat_oleh_fkey foreign key (dibuat_oleh) references public.profiles(id),
  constraint tindak_lanjut_tanggal_check check (tanggal_selesai is null or tanggal_selesai >= tanggal)
);

create table if not exists public.dokumen (
  id uuid not null default gen_random_uuid(),
  siswa_id uuid not null,
  pelanggaran_id uuid,
  tindak_lanjut_id uuid,
  jenis public.jenis_dokumen not null,
  judul text not null,
  nama_file text not null,
  storage_path text not null unique,
  mime_type text,
  ukuran_bytes bigint check (ukuran_bytes >= 0),
  diunggah_oleh uuid not null,
  created_at timestamptz not null default now(),
  constraint dokumen_pkey primary key (id),
  constraint dokumen_siswa_id_fkey foreign key (siswa_id) references public.siswa(id),
  constraint dokumen_pelanggaran_id_fkey foreign key (pelanggaran_id) references public.pelanggaran(id),
  constraint dokumen_tindak_lanjut_id_fkey foreign key (tindak_lanjut_id) references public.tindak_lanjut(id),
  constraint dokumen_diunggah_oleh_fkey foreign key (diunggah_oleh) references public.profiles(id)
);

create table if not exists public.template_surat (
  id uuid not null default gen_random_uuid(),
  jenis public.jenis_surat not null unique,
  judul text not null,
  isi text not null,
  aktif boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint template_surat_pkey primary key (id)
);

create table if not exists public.surat (
  id uuid not null default gen_random_uuid(),
  siswa_id uuid not null,
  tindak_lanjut_id uuid,
  jenis public.jenis_surat not null,
  nomor_surat text unique,
  judul text not null,
  isi text not null,
  status public.status_surat not null default 'draft'::public.status_surat,
  dokumen_id uuid,
  dibuat_oleh uuid not null,
  difinalisasi_pada timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surat_pkey primary key (id),
  constraint surat_siswa_id_fkey foreign key (siswa_id) references public.siswa(id),
  constraint surat_tindak_lanjut_id_fkey foreign key (tindak_lanjut_id) references public.tindak_lanjut(id),
  constraint surat_dokumen_id_fkey foreign key (dokumen_id) references public.dokumen(id),
  constraint surat_dibuat_oleh_fkey foreign key (dibuat_oleh) references public.profiles(id)
);

create table if not exists public.remisi (
  id uuid not null default gen_random_uuid(),
  siswa_id uuid not null,
  jumlah_poin smallint not null check (jumlah_poin > 0),
  keterangan text not null,
  tanggal date not null default current_date,
  surat_dokumen_id uuid not null,
  dicatat_oleh uuid not null,
  created_at timestamptz not null default now(),
  constraint remisi_pkey primary key (id),
  constraint remisi_siswa_id_fkey foreign key (siswa_id) references public.siswa(id),
  constraint remisi_surat_dokumen_id_fkey foreign key (surat_dokumen_id) references public.dokumen(id),
  constraint remisi_dicatat_oleh_fkey foreign key (dicatat_oleh) references public.profiles(id)
);

create table if not exists public.notifikasi (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  judul text not null,
  isi text,
  tipe text not null default 'info'::text,
  tautan text,
  dibaca_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifikasi_pkey primary key (id),
  constraint notifikasi_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

create table if not exists public.push_subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_pkey primary key (id),
  constraint push_subscriptions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

create table if not exists public.audit_log (
  id bigint generated always as identity not null,
  tabel text not null,
  record_id text,
  aksi text not null,
  oleh uuid,
  data_lama jsonb,
  data_baru jsonb,
  created_at timestamptz not null default now(),
  constraint audit_log_pkey primary key (id)
);

-- ---------------------------------------------------------------------
-- Integrity extras (schema gaps)
-- Hanya satu tahun ajaran aktif.
create unique index if not exists tahun_ajaran_satu_aktif on public.tahun_ajaran (aktif) where aktif;

-- Index FK & kolom filter/pencarian
create index if not exists kelas_tahun_ajaran_idx on public.kelas (tahun_ajaran_id);
create index if not exists kelas_wali_idx on public.kelas (wali_kelas_id);
create index if not exists siswa_kelas_idx on public.siswa (kelas_id);
create index if not exists siswa_nama_trgm_idx on public.siswa using gin (nama_lengkap gin_trgm_ops);
create index if not exists ortu_siswa_siswa_idx on public.orang_tua_siswa (siswa_id);
create index if not exists pelanggaran_siswa_idx on public.pelanggaran (siswa_id);
create index if not exists pelanggaran_ta_status_idx on public.pelanggaran (tahun_ajaran_id, status);
create index if not exists pelanggaran_tanggal_idx on public.pelanggaran (tanggal_kejadian desc);
create index if not exists pelanggaran_jenis_idx on public.pelanggaran (jenis_pelanggaran_id);
create index if not exists pelanggaran_pengusul_idx on public.pelanggaran (pengusul_id);
create index if not exists pelanggaran_kelas_idx on public.pelanggaran (kelas_id);
create index if not exists status_log_pelanggaran_idx on public.pelanggaran_status_log (pelanggaran_id, created_at);
create index if not exists tindak_lanjut_siswa_idx on public.tindak_lanjut (siswa_id);
create index if not exists tindak_lanjut_status_idx on public.tindak_lanjut (status, tanggal_selesai);
create index if not exists dokumen_siswa_idx on public.dokumen (siswa_id);
create index if not exists dokumen_pelanggaran_idx on public.dokumen (pelanggaran_id);
create index if not exists surat_siswa_idx on public.surat (siswa_id);
create index if not exists remisi_siswa_idx on public.remisi (siswa_id, tanggal);
create index if not exists notifikasi_user_idx on public.notifikasi (user_id, dibaca_at, created_at desc);
create index if not exists audit_log_tabel_idx on public.audit_log (tabel, record_id);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
