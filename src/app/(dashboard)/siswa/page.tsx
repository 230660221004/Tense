import Link from "next/link";
import { Users } from "lucide-react";
import { z } from "zod";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { STATUS_SISWA_LABEL } from "@/lib/domain/types";

export const metadata = { title: "Siswa" };
const SIZE = 25;

export default async function SiswaPage({ searchParams }: PageProps<"/siswa">) {
  const profile = await requireRoute("siswa");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const kelasId = z.uuid().safeParse(sp.kelas).success ? (sp.kelas as string) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const ta = await getTahunAjaranTerpilih();
  const supabase = await createClient();

  let query = supabase.from("siswa").select("id, nis, nisn, nama_lengkap, jenis_kelamin, status, kelas:kelas_id!inner(id, nama, tahun_ajaran_id)", { count: "exact" });
  if (ta) query = query.eq("kelas.tahun_ajaran_id", ta.id);
  if (kelasId) query = query.eq("kelas_id", kelasId);
  if (q) {
    const t = q.replace(/[\\%_,()."]/g, " ");
    query = query.or(`nama_lengkap.ilike.%${t}%,nis.ilike.%${t}%,nisn.ilike.%${t}%`);
  }
  const [{ data, count }, { data: kelas }, { data: rekap }] = await Promise.all([
    query.order("nama_lengkap").range((page - 1) * SIZE, page * SIZE - 1),
    supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta?.id ?? "").order("tingkat").order("nama"),
    ta ? supabase.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: ta.id }) : Promise.resolve({ data: [] }),
  ]);
  const poin = new Map((rekap ?? []).map((r) => [r.siswa_id, r]));
  const nol = profile.role !== "guru" ? { total_poin: 0, total_remisi: 0, poin_bersih: 0 } : undefined;
  const params = (p: number) => `/siswa?${new URLSearchParams({ ...(q && { q }), ...(kelasId && { kelas: kelasId }), page: String(p) })}`;

  return (
    <>
      <PageHeader eyebrow={ta ? `TA ${ta.nama}` : undefined} title="Siswa" description={profile.role === "guru" ? "Poin hanya ditampilkan untuk siswa di kelas perwalian Anda." : "Direktori siswa beserta poin bersih tahun ajaran terpilih."} />
      <Card>
        <form method="get" className="flex flex-wrap gap-3 border-b border-line p-4 sm:p-5">
          <label htmlFor="sq" className="sr-only">Cari siswa</label>
          <Input id="sq" name="q" defaultValue={q} placeholder="Cari nama, NIS, NISN…" className="max-w-xs" />
          <label htmlFor="sk" className="sr-only">Kelas</label>
          <Select id="sk" name="kelas" defaultValue={kelasId} className="max-w-[200px]">
            <option value="">Semua kelas</option>
            {(kelas ?? []).map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </Select>
          <button className={buttonClass("primary")}>Cari</button>
          {(q || kelasId) && <Link href="/siswa" className={buttonClass("ghost")}>Reset</Link>}
        </form>
        {!data?.length ? (
          <EmptyState icon={Users} title="Siswa tidak ditemukan" description={q || kelasId ? "Ubah kata kunci atau filter kelas." : "Admin dapat menambahkan siswa di menu Master › Data Siswa."} />
        ) : (
          <>
            <Table caption="Daftar siswa">
              <thead><tr><Th>Siswa</Th><Th>NISN</Th><Th>Kelas</Th><Th>Status</Th><Th className="text-right">Poin sah</Th><Th className="text-right">Remisi</Th><Th className="text-right">Poin bersih</Th><Th><span className="sr-only">Aksi</span></Th></tr></thead>
              <tbody>
                {data.map((s) => {
                  const r = poin.get(s.id) ?? nol;
                  return (
                    <Tr key={s.id}>
                      <Td><div className="flex items-center gap-2.5"><Avatar nama={s.nama_lengkap} /><div><p className="font-medium">{s.nama_lengkap}</p><p className="tabular text-[12px] text-ink-2">NIS {s.nis} · {s.jenis_kelamin ?? "-"}</p></div></div></Td>
                      <Td className="tabular text-ink-2">{s.nisn ?? "—"}</Td>
                      <Td>{s.kelas?.nama}</Td>
                      <Td><Badge tone={s.status === "aktif" ? "success" : "neutral"}>{STATUS_SISWA_LABEL[s.status]}</Badge></Td>
                      <Td className="tabular text-right">{r ? r.total_poin : "—"}</Td>
                      <Td className="tabular text-right text-ink-2">{r ? r.total_remisi : "—"}</Td>
                      <Td className="tabular text-right font-semibold">{r ? r.poin_bersih : "—"}</Td>
                      <Td className="text-right"><Link href={`/siswa/${s.id}`} className={buttonClass("secondary", "sm")}>Profil</Link></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={SIZE} total={count ?? 0} hrefFor={params} />
          </>
        )}
      </Card>
    </>
  );
}
