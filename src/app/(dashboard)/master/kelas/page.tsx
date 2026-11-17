import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Disclosure } from "@/components/ui/disclosure";
import { ActionForm } from "@/components/forms/action-form";
import { EditLink } from "@/components/forms/edit-link";
import { simpanKelasAction } from "@/lib/actions/master";

export const metadata = { title: "Kelas" };

export default async function Page({ searchParams }: PageProps<"/master/kelas">) {
  await requireRoute("master");
  const sp = await searchParams;
  const ta = await getTahunAjaranTerpilih();
  const supabase = await createClient();
  const [{ data }, { data: daftarTA }, { data: guru }, { data: jumlah }] = await Promise.all([
    supabase.from("kelas").select("*, ta:tahun_ajaran_id(nama), wali:wali_kelas_id(nama_lengkap)").eq("tahun_ajaran_id", ta?.id ?? "").order("tingkat").order("nama"),
    supabase.from("tahun_ajaran").select("id, nama").order("tanggal_mulai", { ascending: false }),
    supabase.from("profiles").select("id, nama_lengkap").in("role", ["guru", "bk"]).eq("aktif", true).order("nama_lengkap"),
    supabase.from("siswa").select("kelas_id").not("kelas_id", "is", null),
  ]);
  const hitung = new Map<string, number>();
  (jumlah ?? []).forEach((s) => hitung.set(s.kelas_id!, (hitung.get(s.kelas_id!) ?? 0) + 1));
  const edit = data?.find((d) => d.id === sp.edit);
  return (
    <>
      <PageHeader eyebrow={`Master data · TA ${ta?.nama ?? "—"}`} title="Kelas" description="Nama kelas unik per tahun ajaran. Wali kelas dapat melihat rekam kedisiplinan siswa perwaliannya." />
      <div className="mb-4">
        <Disclosure key={edit?.id ?? "baru"} summary={edit ? `Ubah ${edit.nama}` : "Tambah kelas"} defaultOpen={!!edit}>
          <ActionForm action={simpanKelasAction} resetOnSuccess={!edit} hidden={{ id: edit?.id ?? "" }} fields={[
            { name: "nama", label: "Nama kelas", type: "text", required: true, placeholder: "X-3", defaultValue: edit?.nama },
            { name: "tingkat", label: "Tingkat", type: "select", required: true, options: [10, 11, 12].map((n) => ({ value: String(n), label: `Kelas ${n}` })), defaultValue: edit ? String(edit.tingkat) : null },
            { name: "tahun_ajaran_id", label: "Tahun ajaran", type: "select", required: true, options: (daftarTA ?? []).map((t) => ({ value: t.id, label: t.nama })), defaultValue: edit?.tahun_ajaran_id ?? ta?.id ?? null },
            { name: "wali_kelas_id", label: "Wali kelas", type: "select", options: (guru ?? []).map((g) => ({ value: g.id, label: g.nama_lengkap })), defaultValue: edit?.wali_kelas_id ?? null, placeholder: "— Belum ditentukan —" },
          ]} />
        </Disclosure>
      </div>
      <Card>
        {!data?.length ? <EmptyState title="Belum ada kelas pada tahun ajaran ini" /> : (
          <Table caption="Kelas">
            <thead><tr><Th>Kelas</Th><Th>Tingkat</Th><Th>Wali kelas</Th><Th className="text-right">Siswa</Th><Th><span className="sr-only">Aksi</span></Th></tr></thead>
            <tbody>
              {data.map((k) => (
                <Tr key={k.id}>
                  <Td className="font-medium">{k.nama}</Td><Td>{k.tingkat}</Td><Td>{k.wali?.nama_lengkap ?? "—"}</Td>
                  <Td className="tabular text-right">{hitung.get(k.id) ?? 0}</Td>
                  <Td className="text-right"><EditLink href={`?edit=${k.id}`} label={k.nama} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
