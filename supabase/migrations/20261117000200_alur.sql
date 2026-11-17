-- =====================================================================
-- 005 Alur 
--  * Satu tahap keputusan oleh Tanse (role 'bk'): Diusulkan → Sah / Ditolak.
--  * Revisi: Tanse mengubah pasal/keterangan lalu mengesahkan versi revisi.
--  * Input langsung Tanse/admin: poin langsung sah tanpa tahap usulan.
--  * Status 'disetujui' tidak lagi dipakai alur (enum dipertahankan, non-destruktif).
-- =====================================================================

create or replace function public.transisi_pelanggaran_diizinkan(
  p_dari public.status_pelanggaran, p_ke public.status_pelanggaran,
  p_role public.user_role, p_is_pengusul boolean)
returns boolean language sql immutable set search_path = ''
as $$
  select case
    when p_dari = 'menunggu_persetujuan' and p_ke in ('disahkan','ditolak') then p_role in ('bk','admin')
    when p_dari = 'menunggu_persetujuan' and p_ke = 'dibatalkan' then p_role = 'admin' or p_is_pengusul
    -- data lama yang terlanjur 'disetujui' tetap dapat diselesaikan
    when p_dari = 'disetujui' and p_ke in ('disahkan','ditolak','dibatalkan') then p_role in ('bk','admin')
    when p_dari = 'disahkan' and p_ke = 'dibatalkan' then p_role = 'admin'
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

-- Revisi oleh Tanse: ubah pasal/keterangan, poin dihitung ulang dari master, lalu sah.
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
  if not public.has_role('bk','admin') then
    raise exception 'Hanya Tanse/admin yang dapat merevisi' using errcode = '42501';
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
grant execute on function public.revisi_dan_sahkan_pelanggaran(uuid, uuid, text, text) to authenticated;

-- Input langsung Tanse/admin → langsung sah.
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
  if new.tanggal_kejadian > current_date then
    raise exception 'Tanggal kejadian tidak boleh di masa depan' using errcode = '22023';
  end if;

  new.poin := v_jenis.bobot_poin;
  new.kelas_id := v_siswa.kelas_id;
  new.tahun_ajaran_id := coalesce(
    (select k.tahun_ajaran_id from public.kelas k where k.id = v_siswa.kelas_id),
    public.tahun_ajaran_aktif_id());
  if auth.uid() is not null then new.pengusul_id := auth.uid(); end if;
  new.catatan_keputusan := null;

  if v_role in ('bk','admin') then
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
      perform public._notify_roles(array['bk','admin']::public.user_role[],
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

-- Peringatan dini rule-based: siswa yang mencapai ambang aktif terendah (mis. 50) di tingkat_sanksi.
create or replace function public.siswa_ambang(p_tahun_ajaran_id uuid)
returns table (siswa_id uuid, poin_bersih integer, ambang_poin integer, ambang_nama text, ambang_jenis public.jenis_sanksi)
language sql stable security invoker set search_path = ''
as $$
  select r.siswa_id, r.poin_bersih, t.ambang_poin::int, t.nama, t.jenis
  from public.rekap_poin_siswa(p_tahun_ajaran_id) r
  cross join lateral (
    select ts.ambang_poin, ts.nama, ts.jenis from public.tingkat_sanksi ts
    where ts.aktif and r.poin_bersih >= ts.ambang_poin
    order by ts.ambang_poin desc limit 1
  ) t
  order by r.poin_bersih desc
$$;
grant execute on function public.siswa_ambang(uuid) to authenticated;
