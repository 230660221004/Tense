import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Disclosure } from "@/components/ui/disclosure";
import { Avatar } from "@/components/ui/avatar";
import { ActionForm } from "@/components/forms/action-form";
import { EditLink } from "@/components/forms/edit-link";
import { buatPenggunaAction, hubungkanOrtuAction, ubahPenggunaAction } from "@/lib/actions/master";
import { ROLE_LABEL, USER_ROLES } from "@/lib/domain/types";

export const metadata = { title: "Pengguna" };

export default async function Page({ searchParams }: PageProps<"/master/pengguna">) {
  const me = await requireRoute("master");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: siswa }, { data: relasi }] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("nama_lengkap"),
    supabase.from("siswa").select("id, nama_lengkap, nis").eq("status", "aktif").order("nama_lengkap"),
    supabase.from("orang_tua_siswa").select("id, hubungan, ortu:orang_tua_id(nama_lengkap), siswa:siswa_id(nama_lengkap)"),
  ]);
  const edit = data?.find((d) => d.id === sp.edit);
  const roleOpts = USER_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));
  return (
    <>
      <PageHeader eyebrow="Master data" title="Pengguna" description="Akun dibuat di server dengan service role setelah verifikasi admin. Pendaftaran publik dinonaktifkan." />
      <div className="mb-4 space-y-4">
        {edit ? (
          <Disclosure key={edit.id} summary={`Ubah ${edit.nama_lengkap}`} defaultOpen>
            <ActionForm action={ubahPenggunaAction} hidden={{ id: edit.id }} fields={[
              { name: "nama_lengkap", label: "Nama", type: "text", required: true, defaultValue: edit.nama_lengkap },
              { name: "role", label: "Role", type: "select", required: true, options: roleOpts, defaultValue: edit.role },
              { name: "aktif", label: "Akun aktif", type: "checkbox", defaultChecked: edit.aktif },
            ]} />
          </Disclosure>
        ) : (
          <Disclosure summary="Tambah pengguna">
            <ActionForm action={buatPenggunaAction} resetOnSuccess fields={[
              { name: "nama_lengkap", label: "Nama lengkap", type: "text", required: true },
              { name: "email", label: "Email", type: "email", required: true, autoComplete: "off" },
              { name: "role", label: "Role", type: "select", required: true, options: roleOpts },
              { name: "no_hp", label: "No. HP", type: "tel" },
              { name: "password", label: "Password awal", type: "password", required: true, hint: "Minimal 10 karakter. Minta pengguna menggantinya setelah login.", autoComplete: "new-password", span: 2 },
            ]} />
          </Disclosure>
        )}
        <Disclosure summary="Hubungkan orang tua dengan siswa">
          <ActionForm action={hubungkanOrtuAction} resetOnSuccess fields={[
            { name: "orang_tua_id", label: "Akun orang tua", type: "select", required: true, options: (data ?? []).filter((p) => p.role === "orang_tua").map((p) => ({ value: p.id, label: p.nama_lengkap })) },
            { name: "siswa_id", label: "Siswa", type: "select", required: true, options: (siswa ?? []).map((s) => ({ value: s.id, label: `${s.nama_lengkap} — ${s.nis}` })) },
            { name: "hubungan", label: "Hubungan", type: "text", required: true, defaultValue: "orang tua" },
          ]} />
        </Disclosure>
      </div>
      <Card>
        {!data?.length ? <EmptyState title="Belum ada pengguna" /> : (
          <Table caption="Pengguna">
            <thead><tr><Th>Nama</Th><Th>Role</Th><Th>No. HP</Th><Th>Status</Th><Th><span className="sr-only">Aksi</span></Th></tr></thead>
            <tbody>
              {data.map((p) => (
                <Tr key={p.id}>
                  <Td><div className="flex items-center gap-2.5"><Avatar nama={p.nama_lengkap} /><span className="font-medium">{p.nama_lengkap}{p.id === me.id && <span className="text-ink-2"> (Anda)</span>}</span></div></Td>
                  <Td>{ROLE_LABEL[p.role]}</Td>
                  <Td className="text-ink-2">{p.no_hp ?? "—"}</Td>
                  <Td>{p.aktif ? <Badge tone="success">Aktif</Badge> : <Badge tone="danger">Nonaktif</Badge>}</Td>
                  <Td className="text-right"><EditLink href={`?edit=${p.id}`} label={p.nama_lengkap} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {!!relasi?.length && (
        <Card className="mt-4">
          <CardHeader title="Relasi orang tua – siswa" />
          <ul className="mt-3 divide-y divide-line">
            {relasi.map((r) => <li key={r.id} className="px-5 py-3 text-[13.5px]"><span className="font-medium">{r.ortu?.nama_lengkap}</span> <span className="text-ink-2">({r.hubungan}) →</span> {r.siswa?.nama_lengkap}</li>)}
          </ul>
        </Card>
      )}
    </>
  );
}
