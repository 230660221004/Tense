-- =====================================================================
-- 007 Alur remisi berjenjang
--   siswa/orang tua mengajukan -> Tanse (bk) verifikasi -> kepala sekolah memutuskan.
-- Perubahan penting:
--   * tabel remisi_pengajuan (tidak bisa ditulis langsung; hanya lewat fungsi)
--   * remisi (pengurang poin) kini hanya ditulis oleh putuskan_remisi() saat disetujui
--   * siswa/orang tua boleh mengunggah dokumen berjenis surat_remisi untuk dirinya
-- =====================================================================

do $$ begin
  create type public.status_remisi_pengajuan as enum
    ('diajukan','perlu_perbaikan','direkomendasikan','disetujui','ditolak_tanse','ditolak_kepsek');
exception when duplicate_object then null; end $$;

create table if not exists public.remisi_pengajuan (
  id uuid not null default gen_random_uuid(),
  siswa_id uuid not null,
  diajukan_oleh uuid not null,
  alasan text not null check (length(btrim(alasan)) > 0),
  dokumen_id uuid not null,
  status public.status_remisi_pengajuan not null default 'diajukan',
  poin_rekomendasi smallint check (poin_rekomendasi > 0),
  catatan_tanse text,
  diverifikasi_oleh uuid,
  diverifikasi_at timestamptz,
  poin_disahkan smallint check (poin_disahkan > 0),
  catatan_kepsek text,
  diputuskan_oleh uuid,
  diputuskan_at timestamptz,
  remisi_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint remisi_pengajuan_pkey primary key (id),
  constraint remisi_pengajuan_siswa_fkey foreign key (siswa_id) references public.siswa(id),
  constraint remisi_pengajuan_pengaju_fkey foreign key (diajukan_oleh) references public.profiles(id),
  constraint remisi_pengajuan_dokumen_fkey foreign key (dokumen_id) references public.dokumen(id),
  constraint remisi_pengajuan_verif_fkey foreign key (diverifikasi_oleh) references public.profiles(id),
  constraint remisi_pengajuan_putus_fkey foreign key (diputuskan_oleh) references public.profiles(id),
  constraint remisi_pengajuan_remisi_fkey foreign key (remisi_id) references public.remisi(id)
);
create index if not exists remisi_pengajuan_siswa_idx on public.remisi_pengajuan (siswa_id, created_at desc);
create index if not exists remisi_pengajuan_status_idx on public.remisi_pengajuan (status);
-- Satu pengajuan aktif per siswa.
create unique index if not exists remisi_pengajuan_aktif_uq on public.remisi_pengajuan (siswa_id)
  where status in ('diajukan','perlu_perbaikan','direkomendasikan');

drop trigger if exists trg_remisi_pengajuan_updated_at on public.remisi_pengajuan;
create trigger trg_remisi_pengajuan_updated_at before update on public.remisi_pengajuan
  for each row execute function public.set_updated_at();
drop trigger if exists trg_remisi_pengajuan_audit on public.remisi_pengajuan;
create trigger trg_remisi_pengajuan_audit after insert or update or delete on public.remisi_pengajuan
  for each row execute function public.audit_row();

-- ---------- RLS: baca saja; tulis hanya lewat fungsi ------------------
alter table public.remisi_pengajuan enable row level security;
revoke all on public.remisi_pengajuan from anon, authenticated;
grant select on public.remisi_pengajuan to authenticated;

drop policy if exists remisi_pengajuan_select on public.remisi_pengajuan;
create policy remisi_pengajuan_select on public.remisi_pengajuan for select to authenticated
  using (public.can_view_rekam_siswa(siswa_id));


-- remisi (pengurang poin) tidak lagi bisa diinsert langsung oleh siapa pun.
drop policy if exists remisi_insert on public.remisi;
create policy remisi_insert on public.remisi for insert to authenticated with check (false);

-- ---------- Unggah surat remisi oleh siswa / orang tua -----------------
drop policy if exists dokumen_insert on public.dokumen;
create policy dokumen_insert on public.dokumen for insert to authenticated
  with check (
    diunggah_oleh = auth.uid() and (
      public.has_role('bk')
      or (public.has_role('guru') and pelanggaran_id is not null and exists (
          select 1 from public.pelanggaran p where p.id = pelanggaran_id
            and p.pengusul_id = auth.uid() and p.status = 'menunggu_persetujuan'))
      or (public.has_role('siswa','orang_tua') and jenis = 'surat_remisi'
          and pelanggaran_id is null and tindak_lanjut_id is null
          and public.can_view_siswa(siswa_id))
    ));

drop policy if exists arsip_dokumen_insert on storage.objects;
create policy arsip_dokumen_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'arsip-dokumen'
    and (storage.foldername(name))[1] = 'siswa'
    and public.has_role('guru','bk','admin','siswa','orang_tua'));

-- ---------- Fungsi alur -------------------------------------------------
create or replace function public._ta_hari_ini()
returns uuid language sql stable security definer set search_path = ''
as $$
  select id from public.tahun_ajaran
   where public.hari_ini() between tanggal_mulai and tanggal_selesai
   order by aktif desc limit 1
$$;
revoke execute on function public._ta_hari_ini() from public, anon, authenticated;

create or replace function public.ajukan_remisi(p_siswa uuid, p_alasan text, p_dokumen uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.has_role('siswa','orang_tua') then
    raise exception 'Hanya siswa atau orang tua yang dapat mengajukan remisi' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.siswa s where s.id = p_siswa and (
      (public.app_role() = 'siswa' and s.profile_id = auth.uid())
      or (public.app_role() = 'orang_tua' and exists (
            select 1 from public.orang_tua_siswa o where o.siswa_id = s.id and o.orang_tua_id = auth.uid())))
  ) then
    raise exception 'Anda tidak berhak mengajukan remisi untuk siswa ini' using errcode = '42501';
  end if;
  if p_alasan is null or length(btrim(p_alasan)) = 0 then
    raise exception 'Alasan wajib diisi' using errcode = '22023';
  end if;
  if not exists (select 1 from public.dokumen d
                 where d.id = p_dokumen and d.siswa_id = p_siswa and d.jenis = 'surat_remisi') then
    raise exception 'Surat pendukung harus berjenis surat remisi dan milik siswa yang sama' using errcode = '22023';
  end if;
  if exists (select 1 from public.remisi_pengajuan
             where siswa_id = p_siswa and status in ('diajukan','perlu_perbaikan','direkomendasikan')) then
    raise exception 'Masih ada pengajuan remisi untuk siswa ini yang sedang diproses' using errcode = '22023';
  end if;
  insert into public.remisi_pengajuan (siswa_id, diajukan_oleh, alasan, dokumen_id)
  values (p_siswa, auth.uid(), btrim(p_alasan), p_dokumen) returning id into v_id;
  perform public._notify_roles(array['bk']::public.user_role[], 'Pengajuan remisi baru',
    'Ada pengajuan remisi yang perlu diverifikasi.', 'remisi', '/remisi');
  return v_id;
end $$;

create or replace function public.perbaiki_remisi(p_id uuid, p_alasan text, p_dokumen uuid default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare r public.remisi_pengajuan;
begin
  select * into r from public.remisi_pengajuan where id = p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan' using errcode = 'P0002'; end if;
  if r.diajukan_oleh is distinct from auth.uid() then
    raise exception 'Hanya pengaju yang dapat memperbaiki pengajuan' using errcode = '42501';
  end if;
  if r.status <> 'perlu_perbaikan' then
    raise exception 'Pengajuan ini tidak sedang diminta perbaikan' using errcode = '22023';
  end if;
  if p_alasan is null or length(btrim(p_alasan)) = 0 then
    raise exception 'Alasan wajib diisi' using errcode = '22023';
  end if;
  if p_dokumen is not null and not exists (
      select 1 from public.dokumen d where d.id = p_dokumen and d.siswa_id = r.siswa_id and d.jenis = 'surat_remisi') then
    raise exception 'Surat pendukung harus berjenis surat remisi dan milik siswa yang sama' using errcode = '22023';
  end if;
  update public.remisi_pengajuan
     set alasan = btrim(p_alasan), dokumen_id = coalesce(p_dokumen, dokumen_id), status = 'diajukan'
   where id = p_id;
  perform public._notify_roles(array['bk']::public.user_role[], 'Pengajuan remisi diperbaiki',
    'Pengaju telah memperbaiki pengajuan remisi.', 'remisi', '/remisi');
end $$;

-- p_aksi: 'rekomendasi' | 'perbaikan' | 'tolak'
create or replace function public.verifikasi_remisi(p_id uuid, p_aksi text, p_poin integer, p_catatan text)
returns void language plpgsql security definer set search_path = ''
as $$
declare r public.remisi_pengajuan; v_ta uuid; v_bersih integer; v_catatan text := nullif(btrim(coalesce(p_catatan, '')), '');
begin
  if not public.has_role('bk') then
    raise exception 'Hanya Tanse yang dapat memverifikasi remisi' using errcode = '42501';
  end if;
  select * into r from public.remisi_pengajuan where id = p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan' using errcode = 'P0002'; end if;
  if r.status <> 'diajukan' then
    raise exception 'Pengajuan ini sudah diverifikasi atau sedang menunggu perbaikan' using errcode = '22023';
  end if;
  if p_aksi not in ('rekomendasi','perbaikan','tolak') then
    raise exception 'Aksi verifikasi tidak dikenal' using errcode = '22023';
  end if;
  if p_aksi in ('perbaikan','tolak') and v_catatan is null then
    raise exception 'Catatan wajib diisi untuk penolakan atau permintaan perbaikan' using errcode = '22023';
  end if;

  if p_aksi = 'rekomendasi' then
    perform 1 from public.siswa where id = r.siswa_id for update;
    v_ta := public._ta_hari_ini();
    if v_ta is null then
      raise exception 'Tidak ada tahun ajaran yang mencakup tanggal hari ini' using errcode = '22023';
    end if;
    select bp.poin_bersih into v_bersih from public._poin_bersih(r.siswa_id, v_ta) bp;
    if p_poin is null or p_poin < 1 or p_poin > coalesce(v_bersih, 0) then
      raise exception 'Poin rekomendasi harus antara 1 dan poin bersih siswa (%)', coalesce(v_bersih, 0) using errcode = '22023';
    end if;
    update public.remisi_pengajuan
       set status = 'direkomendasikan', poin_rekomendasi = p_poin, catatan_tanse = v_catatan,
           diverifikasi_oleh = auth.uid(), diverifikasi_at = now()
     where id = p_id;
    perform public._notify_roles(array['kepala_sekolah']::public.user_role[], 'Remisi menunggu keputusan',
      'Tanse merekomendasikan remisi dan menunggu keputusan kepala sekolah.', 'remisi', '/remisi');
  else
    update public.remisi_pengajuan
       set status = case when p_aksi = 'perbaikan' then 'perlu_perbaikan'::public.status_remisi_pengajuan
                         else 'ditolak_tanse'::public.status_remisi_pengajuan end,
           catatan_tanse = v_catatan, diverifikasi_oleh = auth.uid(), diverifikasi_at = now()
     where id = p_id;
    perform public._notify(r.diajukan_oleh,
      case when p_aksi = 'perbaikan' then 'Pengajuan remisi perlu diperbaiki' else 'Pengajuan remisi ditolak' end,
      v_catatan, 'remisi', '/dashboard');
  end if;
end $$;

-- Kepala sekolah memutuskan. Jika disetujui, baris remisi (pengurang poin) dibuat di sini.
create or replace function public.putuskan_remisi(p_id uuid, p_setuju boolean, p_poin integer, p_catatan text)
returns void language plpgsql security definer set search_path = ''
as $$
declare r public.remisi_pengajuan; v_poin integer; v_remisi uuid; v_catatan text := nullif(btrim(coalesce(p_catatan, '')), '');
begin
  if not public.has_role('kepala_sekolah') then
    raise exception 'Hanya kepala sekolah yang dapat memutuskan remisi' using errcode = '42501';
  end if;
  select * into r from public.remisi_pengajuan where id = p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan' using errcode = 'P0002'; end if;
  if r.status <> 'direkomendasikan' then
    raise exception 'Pengajuan ini belum direkomendasikan Tanse atau sudah diputuskan' using errcode = '22023';
  end if;

  if p_setuju then
    v_poin := coalesce(p_poin, r.poin_rekomendasi);
    insert into public.remisi (siswa_id, jumlah_poin, keterangan, surat_dokumen_id, dicatat_oleh)
    values (r.siswa_id, v_poin, r.alasan, r.dokumen_id, auth.uid())
    returning id into v_remisi;  -- trigger remisi_before_insert memvalidasi poin bersih & dokumen
    update public.remisi_pengajuan
       set status = 'disetujui', poin_disahkan = v_poin, catatan_kepsek = v_catatan,
           diputuskan_oleh = auth.uid(), diputuskan_at = now(), remisi_id = v_remisi
     where id = p_id;
  else
    if v_catatan is null then
      raise exception 'Catatan wajib diisi untuk penolakan' using errcode = '22023';
    end if;
    update public.remisi_pengajuan
       set status = 'ditolak_kepsek', catatan_kepsek = v_catatan,
           diputuskan_oleh = auth.uid(), diputuskan_at = now()
     where id = p_id;
  end if;

  -- Beri tahu Tanse, pengaju, siswa, dan orang tua siswa.
  perform public._notify(r.diverifikasi_oleh,
    case when p_setuju then 'Remisi disetujui' else 'Remisi ditolak kepala sekolah' end,
    coalesce(v_catatan, 'Keputusan kepala sekolah telah dicatat.'), 'remisi', '/remisi');
  perform public._notify(r.diajukan_oleh,
    case when p_setuju then 'Remisi disetujui' else 'Remisi ditolak' end,
    coalesce(v_catatan, 'Keputusan kepala sekolah telah dicatat.'), 'remisi', '/dashboard');
  perform public._notify(s.profile_id,
    case when p_setuju then 'Remisi disetujui' else 'Remisi ditolak' end,
    coalesce(v_catatan, 'Keputusan kepala sekolah telah dicatat.'), 'remisi', '/dashboard')
    from public.siswa s where s.id = r.siswa_id and s.profile_id is distinct from r.diajukan_oleh;
  perform public._notify(o.orang_tua_id,
    case when p_setuju then 'Remisi disetujui' else 'Remisi ditolak' end,
    coalesce(v_catatan, 'Keputusan kepala sekolah telah dicatat.'), 'remisi', '/dashboard')
    from public.orang_tua_siswa o where o.siswa_id = r.siswa_id and o.orang_tua_id is distinct from r.diajukan_oleh;
end $$;

revoke execute on function public.ajukan_remisi(uuid, text, uuid) from public, anon;
revoke execute on function public.perbaiki_remisi(uuid, text, uuid) from public, anon;
revoke execute on function public.verifikasi_remisi(uuid, text, integer, text) from public, anon;
revoke execute on function public.putuskan_remisi(uuid, boolean, integer, text) from public, anon;
grant execute on function public.ajukan_remisi(uuid, text, uuid) to authenticated;
grant execute on function public.perbaiki_remisi(uuid, text, uuid) to authenticated;
grant execute on function public.verifikasi_remisi(uuid, text, integer, text) to authenticated;
grant execute on function public.putuskan_remisi(uuid, boolean, integer, text) to authenticated;
