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
import { simpanTingkatSanksiAction } from "@/lib/actions/master";
import { JENIS_SANKSI, JENIS_SANKSI_LABEL } from "@/lib/domain/types";

export const metadata = { title: "Tingkat sanksi" };

export default async function Page({ searchParams }: PageProps<"/master/tingkat-sanksi">) {
  await requireRoute("master");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("tingkat_sanksi").select("*").order("ambang_poin");
  const edit = data?.find((d) => d.id === sp.edit);
  return (
    <>
      <PageHeader eyebrow="Master data" title="Tingkat sanksi" description="Ambang poin dibaca langsung oleh profil siswa dan form tindak lanjut — tidak ada ambang yang di-hardcode." />
      <div className="mb-4">
        <Disclosure key={edit?.id ?? "baru"} summary={edit ? `Ubah ${edit.nama}` : "Tambah tingkat sanksi"} defaultOpen={!!edit}>
          <ActionForm action={simpanTingkatSanksiAction} resetOnSuccess={!edit} hidden={{ id: edit?.id ?? "" }} fields={[
            { name: "nama", label: "Nama", type: "text", required: true, defaultValue: edit?.nama },
            { name: "jenis", label: "Jenis", type: "select", required: true, options: JENIS_SANKSI.map((j) => ({ value: j, label: JENIS_SANKSI_LABEL[j] })), defaultValue: edit?.jenis },
            { name: "ambang_poin", label: "Ambang poin", type: "number", required: true, min: 1, defaultValue: edit?.ambang_poin },
            { name: "aktif", label: "Aktif", type: "checkbox", defaultChecked: edit?.aktif ?? true },
            { name: "deskripsi", label: "Deskripsi", type: "textarea", defaultValue: edit?.deskripsi, span: 2 },
          ]} />
        </Disclosure>
      </div>
      <Card>
        {!data?.length ? <EmptyState title="Belum ada tingkat sanksi" /> : (
          <Table caption="Tingkat sanksi">
            <thead><tr><Th className="text-right">Ambang</Th><Th>Nama</Th><Th>Jenis</Th><Th>Status</Th><Th><span className="sr-only">Aksi</span></Th></tr></thead>
            <tbody>
              {data.map((t) => (
                <Tr key={t.id}>
                  <Td className="tabular text-right font-semibold">{t.ambang_poin}</Td>
                  <Td><p className="font-medium">{t.nama}</p>{t.deskripsi && <p className="text-[12px] text-ink-2">{t.deskripsi}</p>}</Td>
                  <Td>{JENIS_SANKSI_LABEL[t.jenis]}</Td>
                  <Td>{t.aktif ? <Badge tone="success">Aktif</Badge> : <Badge>Nonaktif</Badge>}</Td>
                  <Td className="text-right"><EditLink href={`?edit=${t.id}`} label={t.nama} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
