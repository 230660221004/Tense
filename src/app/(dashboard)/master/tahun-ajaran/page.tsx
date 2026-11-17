import { requireRoute } from "@/lib/auth/session";
import { getDaftarTahunAjaran } from "@/lib/queries/tahun-ajaran";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Disclosure } from "@/components/ui/disclosure";
import { ActionForm } from "@/components/forms/action-form";
import { EditLink } from "@/components/forms/edit-link";
import { aktifkanTahunAjaranAction, simpanTahunAjaranAction } from "@/lib/actions/master";
import { formatTanggal } from "@/lib/utils/format";

export const metadata = { title: "Tahun ajaran" };

export default async function Page({ searchParams }: PageProps<"/master/tahun-ajaran">) {
  await requireRoute("master");
  const sp = await searchParams;
  const data = await getDaftarTahunAjaran();
  const edit = data.find((d) => d.id === sp.edit);
  return (
    <>
      <PageHeader eyebrow="Master data" title="Tahun ajaran" description="Hanya satu tahun ajaran aktif (dijaga unique index). Data poin selalu terikat tahun ajaran." />
      {typeof sp.galat === "string" && <p role="alert" className="mb-4 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">{sp.galat}</p>}
      <div className="mb-4">
        <Disclosure key={edit?.id ?? "baru"} summary={edit ? `Ubah ${edit.nama}` : "Tambah tahun ajaran"} defaultOpen={!!edit}>
          <ActionForm action={simpanTahunAjaranAction} resetOnSuccess={!edit} hidden={{ id: edit?.id ?? "" }} fields={[
            { name: "nama", label: "Nama", type: "text", required: true, placeholder: "2027/2028", defaultValue: edit?.nama, span: 2 },
            { name: "tanggal_mulai", label: "Mulai", type: "date", required: true, defaultValue: edit?.tanggal_mulai },
            { name: "tanggal_selesai", label: "Selesai", type: "date", required: true, defaultValue: edit?.tanggal_selesai },
          ]} />
        </Disclosure>
      </div>
      <Card>
        {!data.length ? <EmptyState title="Belum ada tahun ajaran" /> : (
          <Table caption="Tahun ajaran">
            <thead><tr><Th>Nama</Th><Th>Periode</Th><Th>Status</Th><Th><span className="sr-only">Aksi</span></Th></tr></thead>
            <tbody>
              {data.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-medium">{t.nama}</Td>
                  <Td>{formatTanggal(t.tanggal_mulai)} – {formatTanggal(t.tanggal_selesai)}</Td>
                  <Td>{t.aktif ? <Badge tone="success">Aktif</Badge> : <Badge>Nonaktif</Badge>}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      {!t.aktif && (
                        <form action={aktifkanTahunAjaranAction}><input type="hidden" name="id" value={t.id} /><button className="rounded-[8px] bg-ink px-2.5 py-1.5 text-[12px] font-medium text-white">Jadikan aktif</button></form>
                      )}
                      <EditLink href={`?edit=${t.id}`} label={t.nama} />
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
