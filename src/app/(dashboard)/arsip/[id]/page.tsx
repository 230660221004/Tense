import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { z } from "zod";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusPelanggaranBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Avatar } from "@/components/ui/avatar";
import { ActionForm } from "@/components/forms/action-form";
import { aksiTersedia, bolehRevisi } from "@/lib/domain/status";
import { JALUR_LABEL, JENIS_DOKUMEN_LABEL, STATUS_PELANGGARAN_LABEL } from "@/lib/domain/types";
import { formatBytes, formatTanggal, formatWaktu } from "@/lib/utils/format";
import { uploadDokumenAction } from "@/lib/actions/dokumen";
import { KeputusanPanel } from "./keputusan-panel";

export const metadata = { title: "Detail pelanggaran" };

export default async function DetailPage({ params, searchParams }: PageProps<"/arsip/[id]">) {
  const profile = await requireRoute("arsip");
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("pelanggaran")
    .select("*, siswa:siswa_id(id, nis, nama_lengkap), kelas:kelas_id(nama), jenis:jenis_pelanggaran_id(kode, pasal, nama, deskripsi), pengusul:pengusul_id(nama_lengkap), pemutus:diputuskan_oleh(nama_lengkap), ta:tahun_ajaran_id(nama)")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const [{ data: log }, { data: dok }] = await Promise.all([
    supabase.from("pelanggaran_status_log").select("id, status_dari, status_ke, catatan, created_at, oleh:oleh(nama_lengkap)").eq("pelanggaran_id", id).order("created_at"),
    supabase.from("dokumen").select("id, judul, jenis, nama_file, ukuran_bytes, created_at").eq("pelanggaran_id", id).order("created_at"),
  ]);
  const aksi = aksiTersedia(p.status, profile.role, p.pengusul_id === profile.id);
  const revisi = bolehRevisi(p.status, profile.role)
    ? {
        jenis: ((await supabase.from("jenis_pelanggaran").select("id, pasal, nama, bobot_poin").eq("aktif", true).order("pasal")).data ?? []).map((j) => ({ id: j.id, pasal: j.pasal, label: j.nama, poin: j.bobot_poin })),
        jenisId: p.jenis_pelanggaran_id,
        deskripsi: p.deskripsi ?? "",
      }
    : null;
  const bolehUpload = profile.role === "bk" || (profile.role === "guru" && p.pengusul_id === profile.id && p.status === "menunggu_persetujuan");
  const pesan = typeof sp.pesan === "string" ? sp.pesan : undefined;

  return (
    <>
      <Link href="/arsip" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Arsip
      </Link>
      <PageHeader
        eyebrow={`TA ${p.ta?.nama ?? "—"} · ${JALUR_LABEL[p.jalur]}`}
        title={`Pasal ${p.jenis?.pasal} · ${p.jenis?.nama}`}
        actions={<StatusPelanggaranBadge status={p.status} />}
      />
      {pesan && (
        <p role="status" className="mb-4 rounded-[12px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">{pesan}</p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Rincian" />
            <div className="p-5">
              <Link href={`/siswa/${p.siswa?.id}`} className="mb-5 flex items-center gap-3 rounded-[12px] border border-line p-3 hover:bg-[#fafafb]">
                <Avatar nama={p.siswa?.nama_lengkap ?? "?"} className="size-10" />
                <div>
                  <p className="font-semibold">{p.siswa?.nama_lengkap}</p>
                  <p className="text-[13px] text-ink-2">NIS {p.siswa?.nis} · {p.kelas?.nama ?? "—"} (saat kejadian)</p>
                </div>
              </Link>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13.5px] sm:grid-cols-3">
                <Item label="Tanggal kejadian" value={formatTanggal(p.tanggal_kejadian, { day: "numeric", month: "long", year: "numeric" })} />
                <Item label="Pasal" value={`Pasal ${p.jenis?.pasal} (${p.jenis?.kode})`} />
                <Item label={p.status === "disahkan" ? "Poin (sah)" : "Poin (belum dihitung)"} value={<span className="tabular text-lg font-semibold">{p.poin}</span>} />
                <Item label="Pengusul" value={p.pengusul?.nama_lengkap ?? "—"} />
                <Item label="Diputuskan oleh" value={p.pemutus?.nama_lengkap ? `${p.pemutus.nama_lengkap}, ${formatWaktu(p.diputuskan_pada)}` : "—"} />
                <Item label="Sah sejak" value={p.disahkan_pada ? formatWaktu(p.disahkan_pada) : "—"} />
              </dl>
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[12px] font-medium text-ink-2">Kronologi</p>
                <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed">{p.deskripsi || "—"}</p>
              </div>
              {p.catatan_keputusan && (
                <div className="mt-4 rounded-[12px] bg-surface-muted p-3.5">
                  <p className="text-[12px] font-medium text-ink-2">Catatan keputusan</p>
                  <p className="mt-1 text-[13.5px]">{p.catatan_keputusan}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Dokumen & bukti" description="Disimpan privat; tautan unduhan berlaku 60 detik." />
            {dok?.length ? (
              <ul className="mt-3 divide-y divide-line">
                {dok.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <FileText className="size-5 text-ink-2" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{d.judul}</p>
                      <p className="text-[12px] text-ink-2">{JENIS_DOKUMEN_LABEL[d.jenis]} · {formatBytes(d.ukuran_bytes)} · {formatTanggal(d.created_at)}</p>
                    </div>
                    <a href={`/api/dokumen/${d.id}`} className="inline-flex items-center gap-1.5 rounded-[8px] border border-line-strong px-2.5 py-1.5 text-[12px] font-medium hover:bg-surface-muted">
                      <Download className="size-3.5" aria-hidden /> Unduh
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Belum ada dokumen" description="Bukti pendukung dapat diunggah oleh pengusul (selama menunggu) atau BK." />
            )}
            {bolehUpload && (
              <div className="border-t border-line p-5">
                <ActionForm
                  action={uploadDokumenAction}
                  resetOnSuccess
                  hidden={{ siswa_id: p.siswa_id, pelanggaran_id: p.id, jenis: "bukti_pelanggaran" }}
                  submitLabel="Unggah"
                  submitVariant="secondary"
                  fields={[
                    { name: "judul", label: "Judul dokumen", type: "text", required: true, defaultValue: "Bukti pelanggaran" },
                    { name: "file", label: "File", type: "file", required: true, hint: "PDF/JPG/PNG/WEBP, maks. 10 MB" },
                  ]}
                />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {(aksi.length > 0 || revisi) && (
            <Card>
              <CardHeader title="Keputusan" description="Divalidasi ulang di database." />
              <div className="p-5">
                <KeputusanPanel id={p.id} aksi={aksi} revisi={revisi} />
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="Riwayat status" />
            <ol className="relative mx-5 mb-5 mt-4 space-y-5 border-l border-line pl-5">
              {(log ?? []).map((l) => (
                <li key={l.id} className="relative">
                  <span className="absolute -left-[25.5px] top-1 size-2.5 rounded-full border-2 border-surface bg-ink" aria-hidden />
                  <p className="text-[13.5px] font-medium">{STATUS_PELANGGARAN_LABEL[l.status_ke]}</p>
                  <p className="text-[12px] text-ink-2">{l.oleh?.nama_lengkap ?? "Sistem"} · {formatWaktu(l.created_at)}</p>
                  {l.catatan && <p className="mt-1 text-[13px] text-ink-2">“{l.catatan}”</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-2">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
