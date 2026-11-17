import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileDown, FileText, Mail, Plus } from "lucide-react";
import { z } from "zod";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPelanggaranBadge, StatusSuratBadge, StatusTLBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { posisiAmbang } from "@/lib/domain/points";
import { JENIS_DOKUMEN_LABEL, JENIS_SANKSI_LABEL, JENIS_SURAT_LABEL, STATUS_SISWA_LABEL } from "@/lib/domain/types";
import { formatBytes, formatTanggal } from "@/lib/utils/format";
import { PENGELOLA, PENGUSUL, STAFF, canAccess } from "@/lib/permissions";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Profil siswa" };

export default async function SiswaDetail({ params }: PageProps<"/siswa/[id]">) {
  const profile = await requireRoute("siswaDetail");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const ta = await getTahunAjaranTerpilih();
  const { data: s } = await supabase.from("siswa").select("id, nis, nisn, nama_lengkap, jenis_kelamin, kelas_id, status, profile_id, nama_orang_tua, kelas:kelas_id(nama, tingkat, wali:wali_kelas_id(nama_lengkap))").eq("id", id).maybeSingle();
  if (!s) notFound();

  const taFilter = <T extends { eq: (c: string, v: string) => T }>(q: T) => (ta ? q.eq("tahun_ajaran_id", ta.id) : q);
  const [rekapRes, pel, tl, remisi, dok, surat, sanksi, ortu] = await Promise.all([
    ta ? supabase.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: ta.id, p_siswa_id: id }) : Promise.resolve({ data: [] }),
    taFilter(supabase.from("pelanggaran").select("id, tanggal_kejadian, poin, status, jalur, catatan_keputusan, jenis:jenis_pelanggaran_id(kode, nama, pasal)").eq("siswa_id", id)).order("tanggal_kejadian", { ascending: false }),
    supabase.from("tindak_lanjut").select("id, jenis, tanggal, tanggal_selesai, status, total_poin_saat_dibuat, keterangan, sanksi:tingkat_sanksi_id(nama)").eq("siswa_id", id).order("tanggal", { ascending: false }),
    supabase.from("remisi").select("id, jumlah_poin, keterangan, tanggal, surat_dokumen_id").eq("siswa_id", id).order("tanggal", { ascending: false }),
    supabase.from("dokumen").select("id, judul, jenis, ukuran_bytes, created_at").eq("siswa_id", id).order("created_at", { ascending: false }),
    supabase.from("surat").select("id, judul, jenis, status, nomor_surat, created_at").eq("siswa_id", id).order("created_at", { ascending: false }),
    supabase.from("tingkat_sanksi").select("id, nama, jenis, ambang_poin, aktif").order("ambang_poin"),
    supabase.from("orang_tua_siswa").select("hubungan, ortu:orang_tua_id(nama_lengkap)").eq("siswa_id", id),
  ]);
  // rekap null → user tidak berhak melihat rekam kedisiplinan (mis. guru non-wali)
  const rekap = rekapRes.data?.[0];
  const bolehRekam = !!rekap;
  const { tercapai, berikutnya } = posisiAmbang(rekap?.poin_bersih ?? 0, sanksi.data ?? []);
  const sah = (pel.data ?? []).filter((p) => p.status === "disahkan");
  const isStaff = STAFF.includes(profile.role);
  // Kontak orang tua tidak bisa dibaca dari tabel siswa; hanya lewat RPC khusus (Tanse/admin/kepala sekolah/wali kelas).
  const kontak = isStaff ? (await supabase.rpc("kontak_siswa", { p_siswa: id })).data?.[0] : undefined;
  const progress = berikutnya ? Math.min(100, ((rekap?.poin_bersih ?? 0) / berikutnya.ambang_poin) * 100) : 100;

  return (
    <>
      {profile.role !== "siswa" && profile.role !== "orang_tua" && (
        <Link href="/siswa" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> Siswa</Link>
      )}
      <PageHeader
        eyebrow={ta ? `Rekap poin TA ${ta.nama}` : undefined}
        title={s.nama_lengkap}
        actions={
          <>
            {PENGUSUL.includes(profile.role) && s.status === "aktif" && <ButtonLink href={`/arsip/baru?siswa=${s.id}`} variant="secondary"><Plus className="size-4" aria-hidden /> Catat pelanggaran</ButtonLink>}
            {canAccess(profile.role, "riwayatPdf") && <a href={`/api/siswa/${s.id}/riwayat-pdf`} className={buttonClass("secondary")}><FileDown className="size-4" aria-hidden /> Unduh riwayat PDF</a>}
            {PENGELOLA.includes(profile.role) && <ButtonLink href={`/surat?siswa=${s.id}`} variant="secondary"><Mail className="size-4" aria-hidden /> Surat / berita acara</ButtonLink>}
            {PENGELOLA.includes(profile.role) && <ButtonLink href={`/tindak-lanjut?siswa=${s.id}`}>Tindak lanjut</ButtonLink>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Avatar nama={s.nama_lengkap} className="size-14 text-base" />
            <div>
              <p className="font-semibold">{s.nama_lengkap}</p>
              <p className="text-[13px] text-ink-2">{s.kelas?.nama ?? "Tanpa kelas"}</p>
              <Badge className="mt-1.5" tone={s.status === "aktif" ? "success" : "neutral"}>{STATUS_SISWA_LABEL[s.status]}</Badge>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-[13.5px]">
            <div><dt className="text-[12px] text-ink-2">NIS</dt><dd className="tabular font-medium">{s.nis}</dd></div>
            <div><dt className="text-[12px] text-ink-2">NISN</dt><dd className="tabular font-medium">{s.nisn ?? "—"}</dd></div>
            <div><dt className="text-[12px] text-ink-2">Jenis kelamin</dt><dd className="font-medium">{s.jenis_kelamin === "L" ? "Laki-laki" : s.jenis_kelamin === "P" ? "Perempuan" : "—"}</dd></div>
            <div><dt className="text-[12px] text-ink-2">Wali kelas</dt><dd className="font-medium">{s.kelas?.wali?.nama_lengkap ?? "—"}</dd></div>
            {(isStaff || profile.role === "orang_tua" || profile.role === "siswa") && (
              <>
                <div className="col-span-2"><dt className="text-[12px] text-ink-2">Orang tua / wali</dt><dd className="font-medium">{s.nama_orang_tua ?? "—"}{ortu.data?.length ? <span className="font-normal text-ink-2"> · akun: {ortu.data.map((o) => `${o.ortu?.nama_lengkap ?? "—"} (${o.hubungan})`).join(", ")}</span> : null}</dd></div>
                {isStaff && <div className="col-span-2"><dt className="text-[12px] text-ink-2">Kontak orang tua</dt><dd className="font-medium">{kontak?.no_hp_orang_tua ?? "—"}</dd></div>}
              </>
            )}
          </dl>
        </Card>

        <Card className="p-5 lg:col-span-2">
          {bolehRekam ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-[12px] text-ink-2">Poin disahkan</p><p className="tabular mt-1 text-3xl font-semibold tracking-tight">{rekap.total_poin}</p></div>
                <div><p className="text-[12px] text-ink-2">Remisi</p><p className="tabular mt-1 text-3xl font-semibold tracking-tight text-success">−{rekap.total_remisi}</p></div>
                <div className="rounded-[14px] bg-ink p-4 text-white"><p className="text-[12px] text-white/65">Poin bersih</p><p className="tabular mt-1 text-3xl font-semibold tracking-tight">{rekap.poin_bersih}</p></div>
              </div>
              <div className="mt-6">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                  <span className="flex items-center gap-2">Status ambang: {tercapai ? <Badge tone={berikutnya ? "warning" : "danger"}>{tercapai.nama} ({tercapai.ambang_poin})</Badge> : <strong>di bawah ambang</strong>}</span>
                  <span className="text-ink-2">{berikutnya ? `Berikutnya: ${berikutnya.nama} di ${berikutnya.ambang_poin} poin` : "Ambang tertinggi tercapai"}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={berikutnya?.ambang_poin ?? rekap.poin_bersih} aria-valuenow={rekap.poin_bersih} aria-label="Posisi terhadap ambang sanksi berikutnya">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
                  {(sanksi.data ?? []).filter((t) => t.aktif).map((t) => (
                    <li key={t.id} className={rekap.poin_bersih >= t.ambang_poin ? "font-medium text-ink" : ""}>{t.ambang_poin} · {t.nama}</li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-[12px] text-ink-2">Poin bersih = poin pelanggaran berstatus Sah pada TA terpilih − remisi pada rentang TA tersebut. Ambang (peringatan dini, skorsing) dibaca dari master tingkat sanksi; keputusan sanksi tetap di pihak sekolah.</p>
            </>
          ) : (
            <EmptyState title="Rekap poin tidak tersedia" description="Rekam kedisiplinan lengkap hanya dapat dilihat oleh BK, kepala sekolah, admin, wali kelas, siswa yang bersangkutan, dan orang tua terhubung." />
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Sumber poin" description="Pelanggaran Sah yang dihitung dalam total, kronologis" />
          {sah.length ? (
            <ol className="relative mx-5 mb-5 mt-4 space-y-4 border-l border-line pl-5">
              {sah.map((p) => (
                <li key={p.id} className="relative">
                  <span className="absolute -left-[25.5px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-ink" aria-hidden />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={profile.role === "siswa" || profile.role === "orang_tua" ? "#" : `/arsip/${p.id}`} className="text-[13.5px] font-medium hover:underline">{p.jenis?.kode} · {p.jenis?.nama}</Link>
                      <p className="text-[12px] text-ink-2">{formatTanggal(p.tanggal_kejadian, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Pasal {p.jenis?.pasal}</p>
                    </div>
                    <span className="tabular shrink-0 text-[14px] font-semibold">+{p.poin}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Belum ada pelanggaran sah" />
          )}
        </Card>

        <Card>
          <CardHeader title="Riwayat keputusan" description="Diusulkan, sah, ditolak — beserta alasan" />
          {pel.data?.length ? (
            <ul className="mt-3 divide-y divide-line">
              {pel.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0"><p className="truncate text-[13px] font-medium">{p.jenis?.kode} {p.jenis?.nama}</p><p className="text-[12px] text-ink-2">{formatTanggal(p.tanggal_kejadian)} · {p.status === "disahkan" ? `+${p.poin}` : `(${p.poin})`} poin{p.jalur === "langsung" ? " · input langsung" : ""}</p>{p.catatan_keputusan && <p className="text-[12px] text-ink-2">“{p.catatan_keputusan}”</p>}</div>
                  <StatusPelanggaranBadge status={p.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Belum ada usulan" />
          )}
        </Card>
      </div>

      {bolehRekam && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Tindak lanjut / sanksi" />
            {tl.data?.length ? (
              <ul className="mt-3 divide-y divide-line">
                {tl.data.map((t) => (
                  <li key={t.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13.5px] font-medium">{t.sanksi?.nama ?? JENIS_SANKSI_LABEL[t.jenis]}</p>
                      <StatusTLBadge status={t.status} />
                    </div>
                    <p className="text-[12px] text-ink-2">{formatTanggal(t.tanggal)} – {formatTanggal(t.tanggal_selesai)} · snapshot {t.total_poin_saat_dibuat ?? 0} poin</p>
                    {t.keterangan && <p className="mt-1 text-[13px] text-ink-2">{t.keterangan}</p>}
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Belum ada tindak lanjut" />}
          </Card>
          <Card>
            <CardHeader title="Remisi" />
            {remisi.data?.length ? (
              <ul className="mt-3 divide-y divide-line">
                {remisi.data.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div><p className="text-[13.5px]">{r.keterangan}</p><p className="text-[12px] text-ink-2">{formatTanggal(r.tanggal)} · <a className="underline" href={`/api/dokumen/${r.surat_dokumen_id}`}>surat pendukung</a></p></div>
                    <span className="tabular shrink-0 font-semibold text-success">−{r.jumlah_poin}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Belum ada remisi" />}
          </Card>
          <Card>
            <CardHeader title="Dokumen" />
            {dok.data?.length ? (
              <ul className="mt-3 divide-y divide-line">
                {dok.data.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <FileText className="size-5 text-ink-2" aria-hidden />
                    <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-medium">{d.judul}</p><p className="text-[12px] text-ink-2">{JENIS_DOKUMEN_LABEL[d.jenis]} · {formatBytes(d.ukuran_bytes)}</p></div>
                    <a href={`/api/dokumen/${d.id}`} aria-label={`Unduh ${d.judul}`} className="grid size-8 place-items-center rounded-[8px] border border-line-strong hover:bg-surface-muted"><Download className="size-4" aria-hidden /></a>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Belum ada dokumen" />}
          </Card>
          <Card>
            <CardHeader title="Surat" />
            {surat.data?.length ? (
              <ul className="mt-3 divide-y divide-line">
                {surat.data.map((x) => (
                  <li key={x.id}>
                    <Link href={`/surat/${x.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#fafafb]">
                      <div><p className="text-[13.5px] font-medium">{x.judul}</p><p className="text-[12px] text-ink-2">{JENIS_SURAT_LABEL[x.jenis]} · {x.nomor_surat ?? "belum bernomor"}</p></div>
                      <StatusSuratBadge status={x.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Belum ada surat" />}
          </Card>
        </div>
      )}
    </>
  );
}
