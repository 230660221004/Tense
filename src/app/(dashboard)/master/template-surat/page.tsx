import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Disclosure } from "@/components/ui/disclosure";
import { ActionForm } from "@/components/forms/action-form";
import { EditLink } from "@/components/forms/edit-link";
import { simpanTemplateSuratAction } from "@/lib/actions/master";
import { JENIS_SURAT, JENIS_SURAT_LABEL } from "@/lib/domain/types";
import { formatTanggal } from "@/lib/utils/format";

export const metadata = { title: "Template surat" };

export default async function Page({ searchParams }: PageProps<"/master/template-surat">) {
  await requireRoute("master");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("template_surat").select("*").order("jenis");
  const edit = data?.find((d) => d.id === sp.edit);
  return (
    <>
      <PageHeader eyebrow="Master data" title="Template surat" description="Satu template per jenis. Placeholder: {{nama_siswa}}, {{nis}}, {{kelas}}, {{nama_orang_tua}}, {{total_poin}}, {{daftar_pelanggaran}}, {{keterangan}}, {{tempat_tanggal}}." />
      <div className="mb-4">
        <Disclosure key={edit?.id ?? "baru"} summary={edit ? `Ubah ${edit.judul}` : "Tambah template"} defaultOpen={!!edit}>
          <ActionForm action={simpanTemplateSuratAction} resetOnSuccess={!edit} hidden={{ id: edit?.id ?? "" }} fields={[
            { name: "jenis", label: "Jenis surat", type: "select", required: true, options: JENIS_SURAT.map((j) => ({ value: j, label: JENIS_SURAT_LABEL[j] })), defaultValue: edit?.jenis },
            { name: "judul", label: "Judul", type: "text", required: true, defaultValue: edit?.judul },
            { name: "isi", label: "Isi template", type: "textarea", required: true, defaultValue: edit?.isi, rows: 10, span: 2 },
            { name: "aktif", label: "Aktif", type: "checkbox", defaultChecked: edit?.aktif ?? true },
          ]} />
        </Disclosure>
      </div>
      <Card>
        {!data?.length ? <EmptyState title="Belum ada template" /> : (
          <Table caption="Template surat">
            <thead><tr><Th>Jenis</Th><Th>Judul</Th><Th>Diperbarui</Th><Th>Status</Th><Th><span className="sr-only">Aksi</span></Th></tr></thead>
            <tbody>
              {data.map((t) => (
                <Tr key={t.id}>
                  <Td>{JENIS_SURAT_LABEL[t.jenis]}</Td><Td className="font-medium">{t.judul}</Td>
                  <Td className="text-ink-2">{formatTanggal(t.updated_at)}</Td>
                  <Td>{t.aktif ? <Badge tone="success">Aktif</Badge> : <Badge>Nonaktif</Badge>}</Td>
                  <Td className="text-right"><EditLink href={`?edit=${t.id}`} label={t.judul} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
