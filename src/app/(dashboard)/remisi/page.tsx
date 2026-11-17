import Link from "next/link";
import { HeartHandshake } from "lucide-react";
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
import { buatRemisiAction } from "@/lib/actions/remisi";
import { formatTanggal, hariIniJakarta } from "@/lib/utils/format";
import { PENGELOLA } from "@/lib/permissions";

export const metadata = { title: "Remisi" };

export default async function RemisiPage() {
  const profile = await requireRoute("remisi");
  const ta = await getTahunAjaranTerpilih();
  const supabase = await createClient();
  let q = supabase.from("remisi").select("id, jumlah_poin, keterangan, tanggal, surat_dokumen_id, siswa:siswa_id(id, nama_lengkap, nis), pencatat:dicatat_oleh(nama_lengkap)").order("tanggal", { ascending: false }).limit(200);
  if (ta) q = q.gte("tanggal", ta.tanggal_mulai).lte("tanggal", ta.tanggal_selesai);
  const kelola = PENGELOLA.includes(profile.role);
  const [{ data }, siswa] = await Promise.all([q, kelola ? opsiSiswa(ta?.id) : Promise.resolve([])]);

  return (
    <>
      <PageHeader eyebrow={ta ? `TA ${ta.nama}` : undefined} title="Remisi" description="Pengurangan poin wajib disertai surat/dokumen pendukung dan tidak boleh melebihi poin bersih siswa." />
      {kelola && (
        <div className="mb-4">
          <Disclosure summary="Catat remisi">
            <ActionForm
              action={buatRemisiAction}
              resetOnSuccess
              submitLabel="Simpan remisi"
              fields={[
                { name: "siswa_id", label: "Siswa", type: "select", required: true, options: siswa, span: 2 },
                { name: "jumlah_poin", label: "Jumlah poin", type: "number", required: true, min: 1 },
                { name: "tanggal", label: "Tanggal", type: "date", required: true, defaultValue: hariIniJakarta() },
                { name: "keterangan", label: "Alasan remisi", type: "textarea", required: true, span: 2 },
                { name: "file", label: "Surat pendukung", type: "file", required: true, hint: "PDF/JPG/PNG/WEBP, maks. 10 MB. Disimpan sebagai dokumen privat.", span: 2 },
              ]}
            />
          </Disclosure>
        </div>
      )}
      <Card>
        {!data?.length ? (
          <EmptyState icon={HeartHandshake} title="Belum ada remisi" description="Remisi yang tercatat pada tahun ajaran ini akan tampil di sini." />
        ) : (
          <Table caption="Daftar remisi">
            <thead><tr><Th>Tanggal</Th><Th>Siswa</Th><Th>Alasan</Th><Th className="text-right">Poin</Th><Th>Pencatat</Th><Th>Bukti</Th></tr></thead>
            <tbody>
              {data.map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-ink-2">{formatTanggal(r.tanggal)}</Td>
                  <Td><Link href={`/siswa/${r.siswa?.id}`} className="font-medium hover:underline">{r.siswa?.nama_lengkap}</Link><p className="text-[12px] text-ink-2">NIS {r.siswa?.nis}</p></Td>
                  <Td className="max-w-[360px]"><p className="line-clamp-2">{r.keterangan}</p></Td>
                  <Td className="tabular text-right font-semibold text-success">−{r.jumlah_poin}</Td>
                  <Td className="text-ink-2">{r.pencatat?.nama_lengkap}</Td>
                  <Td><a href={`/api/dokumen/${r.surat_dokumen_id}`} className="text-[13px] font-medium underline">Unduh</a></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
