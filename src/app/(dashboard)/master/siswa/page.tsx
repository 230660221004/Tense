import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Disclosure } from "@/components/ui/disclosure";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";
import { ActionForm } from "@/components/forms/action-form";
import { EditLink } from "@/components/forms/edit-link";
import { simpanSiswaAction } from "@/lib/actions/master";
import { STATUS_SISWA, STATUS_SISWA_LABEL } from "@/lib/domain/types";

export const metadata = { title: "Data siswa" };
const SIZE = 25;

export default async function Page({ searchParams }: PageProps<"/master/siswa">) {
  await requireRoute("master");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[\\%_,()."]/g, " ").trim().slice(0, 60) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase.from("siswa").select("id, nis, nisn, nama_lengkap, jenis_kelamin, kelas_id, status, profile_id, nama_orang_tua, kelas:kelas_id(nama, ta:tahun_ajaran_id(nama))", { count: "exact" }).order("nama_lengkap").range((page - 1) * SIZE, page * SIZE - 1);
  if (q) query = query.or(`nama_lengkap.ilike.%${q}%,nis.ilike.%${q}%`);
  const [{ data, count }, { data: kelas }, { data: akun }, editRes] = await Promise.all([
    query,
    supabase.from("kelas").select("id, nama, ta:tahun_ajaran_id(nama, aktif)").order("tingkat").order("nama"),
    supabase.from("profiles").select("id, nama_lengkap").eq("role", "siswa").order("nama_lengkap"),
    typeof sp.edit === "string" ? supabase.from("siswa").select("id, nis, nisn, nama_lengkap, jenis_kelamin, kelas_id, status, profile_id, nama_orang_tua").eq("id", sp.edit).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const edit = editRes.data;
  const kontakEdit = edit ? (await supabase.rpc("kontak_siswa", { p_siswa: edit.id })).data?.[0] : undefined;
  return (
    <>
      <PageHeader eyebrow="Master data" title="Data siswa" description="NIS dan NISN unik. Siswa tidak dihapus — ubah status menjadi nonaktif/lulus/pindah agar riwayat tetap utuh." />
      <div className="mb-4">
        <Disclosure key={edit?.id ?? "baru"} summary={edit ? `Ubah ${edit.nama_lengkap}` : "Tambah siswa"} defaultOpen={!!edit}>
          <ActionForm action={simpanSiswaAction} resetOnSuccess={!edit} hidden={{ id: edit?.id ?? "" }} fields={[
            { name: "nama_lengkap", label: "Nama lengkap", type: "text", required: true, defaultValue: edit?.nama_lengkap, span: 2 },
            { name: "nis", label: "NIS", type: "text", required: true, defaultValue: edit?.nis },
            { name: "nisn", label: "NISN", type: "text", defaultValue: edit?.nisn },
            { name: "jenis_kelamin", label: "Jenis kelamin", type: "select", required: true, options: [{ value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }], defaultValue: edit?.jenis_kelamin },
            { name: "kelas_id", label: "Kelas", type: "select", options: (kelas ?? []).map((k) => ({ value: k.id, label: `${k.nama} — TA ${k.ta?.nama}${k.ta?.aktif ? " (aktif)" : ""}` })), defaultValue: edit?.kelas_id },
            { name: "status", label: "Status", type: "select", required: true, options: STATUS_SISWA.map((s) => ({ value: s, label: STATUS_SISWA_LABEL[s] })), defaultValue: edit?.status ?? "aktif" },
            { name: "profile_id", label: "Akun siswa (portal)", type: "select", options: (akun ?? []).map((a) => ({ value: a.id, label: a.nama_lengkap })), defaultValue: edit?.profile_id, placeholder: "— Tidak dihubungkan —" },
            { name: "nama_orang_tua", label: "Nama orang tua/wali", type: "text", defaultValue: edit?.nama_orang_tua },
            { name: "no_hp_orang_tua", label: "No. HP orang tua", type: "tel", defaultValue: kontakEdit?.no_hp_orang_tua },
            { name: "alamat", label: "Alamat", type: "textarea", defaultValue: kontakEdit?.alamat, span: 2 },
          ]} />
        </Disclosure>
      </div>
      <Card>
        <form method="get" className="flex gap-3 border-b border-line p-4 sm:p-5">
          <label htmlFor="mq" className="sr-only">Cari</label>
          <Input id="mq" name="q" defaultValue={q} placeholder="Cari nama atau NIS…" className="max-w-xs" />
          <button className={buttonClass("primary")}>Cari</button>
        </form>
        {!data?.length ? <EmptyState title="Belum ada siswa" /> : (
          <>
            <Table caption="Data siswa">
              <thead><tr><Th>Nama</Th><Th>NIS / NISN</Th><Th>L/P</Th><Th>Kelas</Th><Th>Status</Th><Th><span className="sr-only">Aksi</span></Th></tr></thead>
              <tbody>
                {data.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-medium">{s.nama_lengkap}{s.profile_id && <span className="ml-2 text-[11px] text-ink-2">· akun terhubung</span>}</Td>
                    <Td className="tabular">{s.nis}<span className="text-ink-3"> / {s.nisn ?? "—"}</span></Td>
                    <Td>{s.jenis_kelamin ?? "—"}</Td>
                    <Td>{s.kelas?.nama ?? "—"} <span className="text-[12px] text-ink-2">{s.kelas?.ta?.nama}</span></Td>
                    <Td><Badge tone={s.status === "aktif" ? "success" : "neutral"}>{STATUS_SISWA_LABEL[s.status]}</Badge></Td>
                    <Td className="text-right"><EditLink href={`?edit=${s.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} label={s.nama_lengkap} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={SIZE} total={count ?? 0} hrefFor={(p) => `?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`} />
          </>
        )}
      </Card>
    </>
  );
}
