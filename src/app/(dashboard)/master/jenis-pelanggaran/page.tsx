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
import { simpanJenisPelanggaranAction } from "@/lib/actions/master";

export const metadata = { title: "Jenis pelanggaran" };

export default async function Page({ searchParams }: PageProps<"/master/jenis-pelanggaran">) {
  await requireRoute("master");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("jenis_pelanggaran").select("*").order("pasal").order("kode");
  const edit = data?.find((d) => d.id === sp.edit);
  return (
    <>
      <PageHeader eyebrow="Master data" title="Jenis pelanggaran" description="Mengubah bobot tidak mengubah poin pelanggaran lama — poin disimpan sebagai snapshot saat usulan dibuat." />
      <div className="mb-4">
        <Disclosure key={edit?.id ?? "baru"} summary={edit ? `Ubah ${edit.kode}` : "Tambah jenis pelanggaran"} defaultOpen={!!edit}>
          <ActionForm action={simpanJenisPelanggaranAction} resetOnSuccess={!edit} hidden={{ id: edit?.id ?? "" }} fields={[
            { name: "pasal", label: "Pasal", type: "number", required: true, min: 1, defaultValue: edit?.pasal },
            { name: "kode", label: "Kode", type: "text", required: true, placeholder: "K-04", defaultValue: edit?.kode },
            { name: "nama", label: "Nama pelanggaran", type: "text", required: true, defaultValue: edit?.nama, span: 2 },
            { name: "bobot_poin", label: "Bobot poin", type: "number", required: true, min: 0, defaultValue: edit?.bobot_poin },
            { name: "aktif", label: "Aktif (dapat dipilih saat usulan)", type: "checkbox", defaultChecked: edit?.aktif ?? true },
            { name: "deskripsi", label: "Deskripsi", type: "textarea", defaultValue: edit?.deskripsi, span: 2 },
          ]} />
        </Disclosure>
      </div>
      <Card>
        {!data?.length ? <EmptyState title="Belum ada jenis pelanggaran" /> : (
          <Table caption="Jenis pelanggaran">
            <thead><tr><Th>Pasal</Th><Th>Kode</Th><Th>Nama</Th><Th className="text-right">Bobot</Th><Th>Status</Th><Th><span className="sr-only">Aksi</span></Th></tr></thead>
            <tbody>
              {data.map((j) => (
                <Tr key={j.id}>
                  <Td>{j.pasal}</Td><Td className="font-medium">{j.kode}</Td>
                  <Td><p>{j.nama}</p>{j.deskripsi && <p className="text-[12px] text-ink-2">{j.deskripsi}</p>}</Td>
                  <Td className="tabular text-right font-semibold">{j.bobot_poin}</Td>
                  <Td>{j.aktif ? <Badge tone="success">Aktif</Badge> : <Badge>Nonaktif</Badge>}</Td>
                  <Td className="text-right"><EditLink href={`?edit=${j.id}`} label={j.kode} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
