-- =====================================================================
-- 006 Perbaikan privasi, peran, dan zona waktu (sesuai hasil wawancara)
--
--  1. Zona waktu: tanggal acuan WIB (Asia/Jakarta), bukan UTC.
--  2. Peran: keputusan atas poin HANYA oleh Tanse (role 'bk').
--     Admin mengelola akun & master data, tidak ikut memutuskan.
--  3. Privasi dokumen: siswa/orang tua tidak dapat membuka bukti
--     pelanggaran maupun dokumen usulan yang belum sah.
--  4. Privasi kontak: alamat & no. HP orang tua tidak lagi dapat dibaca
--     lewat tabel siswa; hanya lewat kontak_siswa() untuk Tanse, admin,
--     kepala sekolah, dan wali kelas yang bersangkutan.
--  5. Remisi: dokumen pendukung wajib berjenis surat_remisi; pembatalan
--     poin sah tidak boleh membuat poin bersih negatif; aman dari balapan.
--  6. Nomor surat kembali ke 001 setiap tahun (kalender WIB).
-- Migration idempotent (aman dijalankan ulang).
-- =====================================================================

-- ---------- 1. Zona waktu ---------------------------------------------
create or replace function public.hari_ini()
returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Jakarta')::date $$;
grant execute on function public.hari_ini() to authenticated;

alter table public.pelanggaran  alter column tanggal_kejadian set default public.hari_ini();
alter table public.tindak_lanjut alter column tanggal         set default public.hari_ini();
alter table public.remisi        alter column tanggal         set default public.hari_ini();

-- ---------- 2. Peran: hanya Tanse (bk) yang memutuskan ----------------
create or replace function public.transisi_pelanggaran_diizinkan(
  p_dari public.status_pelanggaran, p_ke public.status_pelanggaran,
  p_role public.user_role, p_is_pengusul boolean)
returns boolean language sql immutable set search_path = ''
as $$
  select case
    when p_dari = 'menunggu_persetujuan' and p_ke in ('disahkan','ditolak') then p_role = 'bk'
    when p_dari = 'menunggu_persetujuan' and p_ke = 'dibatalkan' then p_role = 'bk' or (p_is_pengusul and p_role = 'guru')
    -- data lama yang terlanjur 'disetujui' tetap dapat diselesaikan
    when p_dari = 'disetujui' and p_ke in ('disahkan','ditolak','dibatalkan') then p_role = 'bk'
    when p_dari = 'disahkan' and p_ke = 'dibatalkan' then p_role = 'bk'
    else false
  end
$$;

create or replace function public.ubah_status_pelanggaran(
  p_id uuid, p_status public.status_pelanggaran, p_catatan text default null)
returns public.pelanggaran
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.pelanggaran;
  v_role public.user_role := public.app_role();
  v_bersih integer;
begin
  if v_role is null then raise exception 'Sesi tidak valid' using errcode = '42501'; end if;
  select * into v_row from public.pelanggaran where id = p_id for update;
  if not found or not public.can_view_pelanggaran(v_row.siswa_id, v_row.pengusul_id, v_row.status) then
    raise exception 'Pelanggaran tidak ditemukan' using errcode = 'P0002';
  end if;
  if not public.transisi_pelanggaran_diizinkan(v_row.status, p_status, v_role, v_row.pengusul_id = auth.uid()) then
    raise exception 'Transisi % → % tidak diizinkan untuk role %', v_row.status, p_status, v_role using errcode = '42501';
  end if;
  if p_status in ('ditolak','dibatalkan') and coalesce(btrim(p_catatan), '') = '' then
    raise exception 'Alasan wajib diisi untuk penolakan/pembatalan' using errcode = '22023';
  end if;

  -- Membatalkan poin yang sudah sah tidak boleh membuat poin bersih negatif
  -- (mis. remisi sudah dicatat). Baris siswa dikunci agar aman dari balapan dengan remisi.
  if v_row.status = 'disahkan' and p_status = 'dibatalkan' then
    perform 1 from public.siswa where id = v_row.siswa_id for update;
    select bp.poin_bersih into v_bersih from public._poin_bersih(v_row.siswa_id, v_row.tahun_ajaran_id) bp;
    if coalesce(v_bersih, 0) - v_row.poin < 0 then
      raise exception 'Pembatalan ditolak: poin bersih siswa akan menjadi negatif karena remisi yang sudah dicatat' using errcode = '22023';
    end if;
  end if;

  perform set_config('app.status_rpc', 'on', true);
  perform set_config('app.status_catatan', coalesce(p_catatan, ''), true);
  update public.pelanggaran set
    status = p_status,
    diputuskan_oleh = case when v_row.status in ('menunggu_persetujuan','disetujui') then auth.uid() else diputuskan_oleh end,
    diputuskan_pada = case when v_row.status in ('menunggu_persetujuan','disetujui') then now() else diputuskan_pada end,
    catatan_keputusan = coalesce(nullif(btrim(p_catatan), ''), catatan_keputusan),
    disahkan_pada = case when p_status = 'disahkan' then now() else disahkan_pada end
  where id = p_id
  returning * into v_row;
  perform set_config('app.status_rpc', 'off', true);
  return v_row;
end $$;

create or replace function public.revisi_dan_sahkan_pelanggaran(
  p_id uuid, p_jenis_pelanggaran_id uuid, p_deskripsi text, p_catatan text default null)
returns public.pelanggaran
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.pelanggaran;
  v_jenis public.jenis_pelanggaran;
  v_lama public.jenis_pelanggaran;
  v_catatan text;
begin
  if not public.has_role('bk') then
    raise exception 'Hanya Tanse yang dapat merevisi' using errcode = '42501';
  end if;
  select * into v_row from public.pelanggaran where id = p_id for update;
  if not found then raise exception 'Pelanggaran tidak ditemukan' using errcode = 'P0002'; end if;
  if v_row.status not in ('menunggu_persetujuan','disetujui') then
    raise exception 'Hanya usulan yang belum diputuskan yang dapat direvisi' using errcode = '22023';
  end if;
  select * into v_jenis from public.jenis_pelanggaran where id = p_jenis_pelanggaran_id and aktif;
  if not found then raise exception 'Pasal tidak valid atau nonaktif' using errcode = '22023'; end if;
  if coalesce(btrim(p_deskripsi), '') = '' then raise exception 'Keterangan wajib diisi' using errcode = '22023'; end if;
  select * into v_lama from public.jenis_pelanggaran where id = v_row.jenis_pelanggaran_id;

  v_catatan := 'Direvisi'
    || case when v_lama.id <> v_jenis.id
         then format(': pasal %s (%s poin) → pasal %s (%s poin)', v_lama.pasal, v_row.poin, v_jenis.pasal, v_jenis.bobot_poin)
         else ': keterangan diperbarui' end
    || coalesce('. ' || nullif(btrim(p_catatan), ''), '');

  perform set_config('app.status_rpc', 'on', true);
  perform set_config('app.status_catatan', v_catatan, true);
  update public.pelanggaran set
    jenis_pelanggaran_id = v_jenis.id,
    poin = v_jenis.bobot_poin,
    deskripsi = btrim(p_deskripsi),
    status = 'disahkan',
    diputuskan_oleh = auth.uid(),
    diputuskan_pada = now(),
    disahkan_pada = now(),
    catatan_keputusan = v_catatan
  where id = p_id
  returning * into v_row;
  perform set_config('app.status_rpc', 'off', true);
  return v_row;
end $$;

-- Input langsung hanya oleh Tanse → langsung sah. Tanggal acuan WIB.
create or replace function public.pelanggaran_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_jenis public.jenis_pelanggaran;
  v_siswa public.siswa;
  v_role public.user_role := public.app_role();
begin
  select * into v_jenis from public.jenis_pelanggaran where id = new.jenis_pelanggaran_id;
  if not found or not v_jenis.aktif then
    raise exception 'Jenis pelanggaran tidak valid atau nonaktif' using errcode = '22023';
  end if;
  select * into v_siswa from public.siswa where id = new.siswa_id;
  if not found or v_siswa.status <> 'aktif' then
    raise exception 'Siswa tidak ditemukan atau tidak aktif' using errcode = '22023';
  end if;
  if new.tanggal_kejadian > public.hari_ini() then
    raise exception 'Tanggal kejadian tidak boleh di masa depan' using errcode = '22023';
  end if;

  new.poin := v_jenis.bobot_poin;
  new.kelas_id := v_siswa.kelas_id;
  new.tahun_ajaran_id := coalesce(
    (select k.tahun_ajaran_id from public.kelas k where k.id = v_siswa.kelas_id),
    public.tahun_ajaran_aktif_id());
  if auth.uid() is not null then new.pengusul_id := auth.uid(); end if;
  new.catatan_keputusan := null;

  if v_role = 'bk' then
    new.jalur := 'langsung';
    new.status := 'disahkan';
    new.diputuskan_oleh := auth.uid();
    new.diputuskan_pada := now();
    new.disahkan_pada := now();
    new.catatan_keputusan := 'Input langsung Tanse';
  else
    new.jalur := 'usulan';
    new.status := 'menunggu_persetujuan';
    new.diputuskan_oleh := null; new.diputuskan_pada := null; new.disahkan_pada := null;
  end if;
  return new;
end $$;

create or replace function public.pelanggaran_after_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_nama text; v_link text := '/arsip/' || new.id;
begin
  select nama_lengkap into v_nama from public.siswa where id = new.siswa_id;
  if tg_op = 'INSERT' then
    insert into public.pelanggaran_status_log (pelanggaran_id, status_dari, status_ke, oleh, catatan)
    values (new.id, null, new.status, auth.uid(),
      case when new.jalur = 'langsung' then 'Input langsung Tanse — langsung sah' else 'Usulan dibuat' end);
    if new.status = 'menunggu_persetujuan' then
      perform public._notify_roles(array['bk']::public.user_role[],
        'Usulan pelanggaran baru', coalesce(v_nama, 'Siswa') || ' — menunggu keputusan Tanse', 'usulan', v_link);
    end if;
  elsif new.status is distinct from old.status then
    insert into public.pelanggaran_status_log (pelanggaran_id, status_dari, status_ke, oleh, catatan)
    values (new.id, old.status, new.status, auth.uid(), nullif(current_setting('app.status_catatan', true), ''));
    perform public._notify(new.pengusul_id, 'Keputusan usulan',
      coalesce(v_nama, 'Siswa') || ': ' || case new.status when 'disahkan' then 'sah' else new.status::text end, 'status', v_link);
  end if;
  return new;
end $$;

-- Kebijakan tulis: Tanse saja (guru tetap mengusulkan & mengubah usulannya sendiri)
drop policy if exists pelanggaran_insert on public.pelanggaran;
create policy pelanggaran_insert on public.pelanggaran for insert to authenticated
  with check (public.has_role('guru','bk') and pengusul_id = auth.uid());

drop policy if exists pelanggaran_update on public.pelanggaran;
create policy pelanggaran_update on public.pelanggaran for update to authenticated
  using ((pengusul_id = auth.uid() and status = 'menunggu_persetujuan') or public.has_role('bk'))
  with check ((pengusul_id = auth.uid() and status = 'menunggu_persetujuan') or public.has_role('bk'));

drop policy if exists tl_insert on public.tindak_lanjut;
create policy tl_insert on public.tindak_lanjut for insert to authenticated
  with check (public.has_role('bk'));
drop policy if exists tl_update on public.tindak_lanjut;
create policy tl_update on public.tindak_lanjut for update to authenticated
  using (public.has_role('bk')) with check (public.has_role('bk'));

drop policy if exists dokumen_insert on public.dokumen;
create policy dokumen_insert on public.dokumen for insert to authenticated
  with check (
    diunggah_oleh = auth.uid() and (
      public.has_role('bk')
      or (public.has_role('guru') and pelanggaran_id is not null and exists (
          select 1 from public.pelanggaran p where p.id = pelanggaran_id
            and p.pengusul_id = auth.uid() and p.status = 'menunggu_persetujuan'))
    ));

drop policy if exists surat_insert on public.surat;
create policy surat_insert on public.surat for insert to authenticated
  with check (public.has_role('bk') and dibuat_oleh = auth.uid());
drop policy if exists surat_update on public.surat;
create policy surat_update on public.surat for update to authenticated
  using (public.has_role('bk') and status = 'draft')
  with check (public.has_role('bk') and status in ('draft','dibatalkan'));

drop policy if exists remisi_insert on public.remisi;
create policy remisi_insert on public.remisi for insert to authenticated
  with check (public.has_role('bk') and dicatat_oleh = auth.uid());

-- ---------- 3. Privasi dokumen & log ----------------------------------
-- Siswa/orang tua hanya melihat dokumen yang ditujukan kepada mereka
-- (surat pernyataan, surat remisi, surat keluar) — TIDAK pernah bukti
-- pelanggaran atau dokumen 'lainnya'. Guru: dokumen usulannya sendiri
-- dan dokumen siswa di kelas perwaliannya.
drop policy if exists dokumen_select on public.dokumen;
create policy dokumen_select on public.dokumen for select to authenticated
  using (
    public.has_role('admin','bk','kepala_sekolah')
    or diunggah_oleh = auth.uid()
    or (public.has_role('guru') and (
          public.is_wali_kelas_siswa(siswa_id)
          or (pelanggaran_id is not null and exists (
              select 1 from public.pelanggaran p
              where p.id = pelanggaran_id and p.pengusul_id = auth.uid()))))
    or (public.has_role('siswa','orang_tua')
        and jenis in ('surat_pernyataan','surat_remisi','surat_keluar')
        and public.can_view_rekam_siswa(siswa_id))
  );

-- Log keputusan memuat catatan internal: tidak untuk siswa/orang tua.
drop policy if exists status_log_select on public.pelanggaran_status_log;
create policy status_log_select on public.pelanggaran_status_log for select to authenticated
  using (
    public.has_role('admin','bk','kepala_sekolah')
    or exists (
      select 1 from public.pelanggaran p
      where p.id = pelanggaran_id and public.has_role('guru')
        and (p.pengusul_id = auth.uid() or public.is_wali_kelas_siswa(p.siswa_id)))
  );

-- ---------- 4. Privasi kontak siswa -----------------------------------
-- Hak SELECT per kolom: alamat & no_hp_orang_tua dikeluarkan.
-- CATATAN: kolom baru di tabel siswa harus diberi GRANT SELECT secara eksplisit.
revoke select on public.siswa from authenticated;
grant select (id, profile_id, nis, nisn, nama_lengkap, jenis_kelamin, kelas_id, status,
              nama_orang_tua, created_at, updated_at)
  on public.siswa to authenticated;

create or replace function public.kontak_siswa(p_siswa uuid)
returns table (alamat text, no_hp_orang_tua text)
language sql stable security definer set search_path = ''
as $$
  select s.alamat, s.no_hp_orang_tua
  from public.siswa s
  where s.id = p_siswa
    and (public.has_role('admin','bk','kepala_sekolah') or public.is_wali_kelas_siswa(p_siswa))
$$;
grant execute on function public.kontak_siswa(uuid) to authenticated;

-- ---------- 5. Remisi: jenis dokumen, kunci, tanggal WIB --------------
create or replace function public.remisi_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_ta uuid; v_bersih integer;
begin
  if auth.uid() is not null then new.dicatat_oleh := auth.uid(); end if;
  if not exists (
    select 1 from public.dokumen d
    where d.id = new.surat_dokumen_id and d.siswa_id = new.siswa_id and d.jenis = 'surat_remisi') then
    raise exception 'Dokumen pendukung harus berjenis surat remisi dan milik siswa yang sama' using errcode = '22023';
  end if;
  -- Kunci baris siswa: dua remisi bersamaan tidak dapat sama-sama lolos.
  perform 1 from public.siswa where id = new.siswa_id for update;
  select id into v_ta from public.tahun_ajaran
   where new.tanggal between tanggal_mulai and tanggal_selesai order by aktif desc limit 1;
  if v_ta is null then
    raise exception 'Tanggal remisi di luar tahun ajaran yang terdaftar' using errcode = '22023';
  end if;
  select bp.poin_bersih into v_bersih from public._poin_bersih(new.siswa_id, v_ta) bp;
  if new.jumlah_poin > coalesce(v_bersih, 0) then
    raise exception 'Remisi (%) melebihi poin bersih siswa (%)', new.jumlah_poin, coalesce(v_bersih, 0) using errcode = '22023';
  end if;
  return new;
end $$;

-- ---------- 6. Nomor surat per tahun (WIB) ----------------------------
create table if not exists public.surat_nomor_counter (
  tahun integer primary key,
  terakhir integer not null default 0
);
alter table public.surat_nomor_counter enable row level security;
revoke all on public.surat_nomor_counter from anon, authenticated;

-- Lanjutkan dari nomor yang sudah terbit (format 001/BK/XI/2026).
insert into public.surat_nomor_counter (tahun, terakhir)
select (regexp_match(nomor_surat, '/(\d{4})$'))[1]::int,
       max(split_part(nomor_surat, '/', 1)::int)
from public.surat
where nomor_surat ~ '^\d+/.+/\d{4}$'
group by 1
on conflict (tahun) do nothing;

create or replace function public.finalisasi_surat(p_id uuid)
returns public.surat language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.surat;
  v_romawi text[] := array['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  v_now timestamp := now() at time zone 'Asia/Jakarta';
  v_no integer;
begin
  if not public.has_role('bk') then
    raise exception 'Hanya Tanse yang dapat memfinalisasi surat' using errcode = '42501';
  end if;
  select * into v_row from public.surat where id = p_id for update;
  if not found then raise exception 'Surat tidak ditemukan' using errcode = 'P0002'; end if;
  if v_row.status <> 'draft' then raise exception 'Hanya surat draft yang dapat difinalisasi' using errcode = '22023'; end if;

  insert into public.surat_nomor_counter (tahun, terakhir)
  values (extract(year from v_now)::int, 1)
  on conflict (tahun) do update set terakhir = public.surat_nomor_counter.terakhir + 1
  returning terakhir into v_no;

  perform set_config('app.surat_rpc', 'on', true);
  update public.surat set
    status = 'final',
    nomor_surat = lpad(v_no::text, 3, '0') || '/BK/'
      || v_romawi[extract(month from v_now)::int] || '/' || extract(year from v_now)::int,
    difinalisasi_pada = now()
  where id = p_id returning * into v_row;
  perform set_config('app.surat_rpc', 'off', true);
  return v_row;
end $$;
