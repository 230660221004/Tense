import Link from "next/link";
import { History } from "lucide-react";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatWaktu } from "@/lib/utils/format";

export const metadata = { title: "Audit trail" };
const SIZE = 30;
const TABLES = ["pelanggaran", "tindak_lanjut", "remisi", "surat", "dokumen", "siswa", "profiles", "jenis_pelanggaran", "tingkat_sanksi", "tahun_ajaran", "kelas", "template_surat", "orang_tua_siswa"];

function ringkas(aksi: string, lama: Record<string, unknown> | null, baru: Record<string, unknown> | null) {
  if (!lama || !baru) return null;
  const keys = Object.keys(baru).filter((k) => !["updated_at", "created_at"].includes(k) && JSON.stringify(lama[k]) !== JSON.stringify(baru[k]));
  return keys.slice(0, 4).map((k) => `${k}: ${String(lama[k] ?? "∅")} → ${String(baru[k] ?? "∅")}`).join("; ") || aksi;
}

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  await requireRoute("audit");
  const sp = await searchParams;
  const tabel = TABLES.find((t) => t === sp.tabel);
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let q = supabase.from("audit_log").select("id, tabel, record_id, aksi, oleh, data_lama, data_baru, created_at", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);
  if (tabel) q = q.eq("tabel", tabel);
  const { data, count } = await q;
  const ids = [...new Set((data ?? []).map((d) => d.oleh).filter((x): x is string => !!x))];
  const { data: actors } = ids.length ? await supabase.from("profiles").select("id, nama_lengkap").in("id", ids) : { data: [] };
  const nama = new Map((actors ?? []).map((a) => [a.id, a.nama_lengkap]));

  return (
    <>
      <PageHeader title="Audit trail" description="Catatan append-only untuk aksi penting. Data pribadi sensitif (alamat, nomor HP, isi surat) tidak disimpan di log." />
      <Card>
        <form method="get" className="flex flex-wrap items-center gap-3 border-b border-line p-4 sm:p-5">
          <label htmlFor="tabel" className="sr-only">Tabel</label>
          <Select id="tabel" name="tabel" defaultValue={tabel ?? ""} className="max-w-[240px]">
            <option value="">Semua entitas</option>
            {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <button className={buttonClass("primary")}>Filter</button>
          {tabel && <Link href="/audit" className={buttonClass("ghost")}>Reset</Link>}
        </form>
        {!data?.length ? (
          <EmptyState icon={History} title="Belum ada catatan" />
        ) : (
          <>
            <Table caption="Audit log">
              <thead><tr><Th>Waktu</Th><Th>Pelaku</Th><Th>Aksi</Th><Th>Entitas</Th><Th>Perubahan</Th></tr></thead>
              <tbody>
                {data.map((a) => (
                  <Tr key={a.id}>
                    <Td className="whitespace-nowrap text-ink-2">{formatWaktu(a.created_at)}</Td>
                    <Td>{a.oleh ? nama.get(a.oleh) ?? "Pengguna" : <span className="text-ink-2">Sistem / service</span>}</Td>
                    <Td><Badge tone={a.aksi.startsWith("DECISION") || a.aksi === "FINALIZE" ? "info" : a.aksi === "DELETE" ? "danger" : "neutral"}>{a.aksi}</Badge></Td>
                    <Td><p>{a.tabel}</p><p className="tabular text-[11px] text-ink-3">{a.record_id?.slice(0, 8)}</p></Td>
                    <Td className="max-w-[420px] text-[12px] text-ink-2"><p className="line-clamp-2">{a.aksi === "INSERT" ? "Data dibuat" : ringkas(a.aksi, a.data_lama as Record<string, unknown> | null, a.data_baru as Record<string, unknown> | null)}</p></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={SIZE} total={count ?? 0} hrefFor={(p) => `/audit?${new URLSearchParams({ ...(tabel && { tabel }), page: String(p) })}`} />
          </>
        )}
      </Card>
    </>
  );
}
