import { Download, FolderLock } from "lucide-react";
import Link from "next/link";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { opsiSiswa } from "@/lib/queries/options";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Disclosure } from "@/components/ui/disclosure";
import { ActionForm } from "@/components/forms/action-form";
import { uploadDokumenAction } from "@/lib/actions/dokumen";
import { JENIS_DOKUMEN, JENIS_DOKUMEN_LABEL } from "@/lib/domain/types";
import { formatBytes, formatTanggal } from "@/lib/utils/format";
import { PENGELOLA } from "@/lib/permissions";

export const metadata = { title: "Dokumen" };

export default async function DokumenPage() {
  const profile = await requireRoute("dokumen");
  const ta = await getTahunAjaranTerpilih();
  const supabase = await createClient();
  const kelola = PENGELOLA.includes(profile.role);
  const [{ data }, siswa] = await Promise.all([
    supabase.from("dokumen").select("id, judul, jenis, nama_file, mime_type, ukuran_bytes, created_at, pelanggaran_id, siswa:siswa_id(id, nama_lengkap), pengunggah:diunggah_oleh(nama_lengkap)").order("created_at", { ascending: false }).limit(200),
    kelola ? opsiSiswa(ta?.id) : Promise.resolve([]),
  ]);
  return (
    <>
      <PageHeader title="Dokumen" description="Disimpan di Supabase Storage privat. Unduhan memakai tautan bertanda tangan 60 detik setelah otorisasi." />
      {kelola && (
        <div className="mb-4">
          <Disclosure summary="Unggah dokumen">
            <ActionForm
              action={uploadDokumenAction}
              resetOnSuccess
              submitLabel="Unggah"
              fields={[
                { name: "siswa_id", label: "Siswa", type: "select", required: true, options: siswa, span: 2 },
                { name: "jenis", label: "Jenis dokumen", type: "select", required: true, options: JENIS_DOKUMEN.map((j) => ({ value: j, label: JENIS_DOKUMEN_LABEL[j] })) },
                { name: "judul", label: "Judul", type: "text", required: true },
                { name: "file", label: "File", type: "file", required: true, hint: "PDF/JPG/PNG/WEBP, maks. 10 MB. Tipe diverifikasi dari isi file.", span: 2 },
              ]}
            />
          </Disclosure>
        </div>
      )}
      <Card>
        {!data?.length ? (
          <EmptyState icon={FolderLock} title="Belum ada dokumen" />
        ) : (
          <Table caption="Daftar dokumen">
            <thead><tr><Th>Judul</Th><Th>Siswa</Th><Th>Jenis</Th><Th>Ukuran</Th><Th>Diunggah</Th><Th><span className="sr-only">Unduh</span></Th></tr></thead>
            <tbody>
              {data.map((d) => (
                <Tr key={d.id}>
                  <Td><p className="font-medium">{d.judul}</p><p className="text-[12px] text-ink-2">{d.nama_file}{d.pelanggaran_id && <> · <Link className="underline" href={`/arsip/${d.pelanggaran_id}`}>pelanggaran</Link></>}</p></Td>
                  <Td><Link href={`/siswa/${d.siswa?.id}`} className="hover:underline">{d.siswa?.nama_lengkap}</Link></Td>
                  <Td>{JENIS_DOKUMEN_LABEL[d.jenis]}</Td>
                  <Td className="tabular text-ink-2">{formatBytes(d.ukuran_bytes)}</Td>
                  <Td className="text-ink-2"><p>{formatTanggal(d.created_at)}</p><p className="text-[12px]">{d.pengunggah?.nama_lengkap}</p></Td>
                  <Td className="text-right"><a href={`/api/dokumen/${d.id}`} aria-label={`Unduh ${d.judul}`} className="inline-grid size-8 place-items-center rounded-[8px] border border-line-strong hover:bg-surface-muted"><Download className="size-4" aria-hidden /></a></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
