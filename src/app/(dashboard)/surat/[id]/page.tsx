import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { z } from "zod";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusSuratBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/forms/action-form";
import { batalkanSuratAction, finalisasiSuratAction, simpanDraftSuratAction } from "@/lib/actions/surat";
import { JENIS_SURAT_LABEL } from "@/lib/domain/types";
import { formatTanggal, formatWaktu } from "@/lib/utils/format";
import { PENGELOLA, STAFF } from "@/lib/permissions";
import { PrintButton } from "./print-button";

export const metadata = { title: "Surat" };

export default async function SuratDetail({ params, searchParams }: PageProps<"/surat/[id]">) {
  const profile = await requireRoute("siswaDetail");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: s } = await supabase.from("surat").select("*, siswa:siswa_id(id, nama_lengkap, nis), pembuat:dibuat_oleh(nama_lengkap)").eq("id", id).maybeSingle();
  if (!s) notFound();
  const kelola = PENGELOLA.includes(profile.role) && s.status === "draft";
  const pesan = (await searchParams).pesan;

  return (
    <>
      <Link href={STAFF.includes(profile.role) ? "/surat" : `/siswa/${s.siswa?.id}`} className="no-print mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> Kembali</Link>
      <div className="no-print">
        <PageHeader eyebrow={JENIS_SURAT_LABEL[s.jenis]} title={s.judul} actions={<><StatusSuratBadge status={s.status} /><a href={`/api/surat/${s.id}/pdf`} className={buttonClass("secondary")}><Download className="size-4" aria-hidden /> Unduh PDF</a><PrintButton /></>} />
      </div>
      {typeof pesan === "string" && (
        <p role="status" className="no-print mb-4 rounded-[12px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">{pesan}</p>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-8 sm:p-12 lg:col-span-2 print:border-0 print:shadow-none">
          {s.status !== "final" && (
            <p className="absolute right-6 top-6 rotate-6 rounded-[6px] border-2 border-danger px-3 py-1 text-[12px] font-bold uppercase tracking-widest text-danger" aria-label="Status dokumen">
              {s.status === "draft" ? "Draft — belum sah" : "Dibatalkan"}
            </p>
          )}
          <header className="border-b-2 border-ink pb-4 text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em]">Bimbingan Konseling &amp; Kesiswaan</p>
            <p className="text-[12px] text-ink-2">Dokumen dihasilkan TANSE</p>
          </header>
          <dl className="mt-6 grid grid-cols-[110px_1fr] gap-y-1 text-[14px]">
            <dt>Nomor</dt><dd>: {s.nomor_surat ?? "(diberikan saat finalisasi)"}</dd>
            <dt>Perihal</dt><dd>: {s.judul}</dd>
            <dt>Siswa</dt><dd>: {s.siswa?.nama_lengkap} (NIS {s.siswa?.nis})</dd>
          </dl>
          <div className="mt-6 whitespace-pre-line text-[14.5px] leading-[1.75]">{s.isi}</div>
          <footer className="mt-12 flex justify-end text-[14px]">
            <div className="w-56 text-center">
              <p>{s.difinalisasi_pada ? formatTanggal(s.difinalisasi_pada, { day: "numeric", month: "long", year: "numeric" }) : "……………………"}</p>
              <p className="mt-1">Guru BK / Tanse</p>
              <div className="h-20" />
              <p className="border-t border-ink pt-1 text-[12px] text-ink-2">Nama &amp; tanda tangan (manual)</p>
            </div>
          </footer>
        </Card>
        <div className="no-print space-y-4">
          <Card>
            <CardHeader title="Informasi" />
            <dl className="space-y-3 p-5 text-[13.5px]">
              <div><dt className="text-[12px] text-ink-2">Dibuat</dt><dd>{s.pembuat?.nama_lengkap} · {formatWaktu(s.created_at)}</dd></div>
              <div><dt className="text-[12px] text-ink-2">Finalisasi</dt><dd>{s.difinalisasi_pada ? formatWaktu(s.difinalisasi_pada) : "—"}</dd></div>
            </dl>
          </Card>
          {kelola && (
            <>
              <Card>
                <CardHeader title="Edit draft" />
                <div className="p-5">
                  <ActionForm action={simpanDraftSuratAction} columns={1} hidden={{ id: s.id }} submitVariant="secondary" fields={[
                    { name: "judul", label: "Judul", type: "text", required: true, defaultValue: s.judul },
                    { name: "isi", label: "Isi", type: "textarea", required: true, defaultValue: s.isi, rows: 10 },
                  ]} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Finalisasi" description="Nomor surat diberikan otomatis dan isi terkunci." />
                <div className="space-y-3 p-5">
                  <ActionForm action={finalisasiSuratAction} columns={1} hidden={{ id: s.id }} submitLabel="Finalisasi & beri nomor" fields={[]} />
                  <ActionForm action={batalkanSuratAction} columns={1} hidden={{ id: s.id }} submitLabel="Batalkan draft" submitVariant="danger" fields={[]} />
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
