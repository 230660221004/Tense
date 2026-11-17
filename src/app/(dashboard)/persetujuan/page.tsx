import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusPelanggaranBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { buttonClass } from "@/components/ui/button";
import { formatTanggal } from "@/lib/utils/format";
import { cn } from "@/lib/utils/format";
import type { StatusPelanggaran } from "@/lib/domain/types";

export const metadata = { title: "Persetujuan" };

export default async function PersetujuanPage({ searchParams }: PageProps<"/persetujuan">) {
  const profile = await requireRoute("persetujuan");
  const sp = await searchParams;
  const ta = await getTahunAjaranTerpilih();
  await Promise.resolve(profile);
  const tabs: { key: StatusPelanggaran; label: string; desc: string }[] = [
    { key: "menunggu_persetujuan", label: "Diusulkan", desc: "Setujui, revisi, atau tolak usulan guru/wali kelas. Poin baru bertambah setelah Sah." },
    { key: "ditolak", label: "Ditolak", desc: "Usulan yang ditolak beserta alasannya. Tidak menambah poin." },
  ];
  const active = tabs.find((t) => t.key === sp.tab) ?? tabs[0]!;
  const supabase = await createClient();
  const counts = await Promise.all(tabs.map((t) => supabase.from("pelanggaran").select("id", { count: "exact", head: true }).eq("status", t.key).then((r) => r.count ?? 0)));
  let q = supabase.from("v_arsip_pelanggaran").select("id, tanggal_kejadian, siswa_nama, nis, kelas_nama, kode, jenis_nama, poin, pengusul_nama, status, created_at").eq("status", active.key).order("created_at", { ascending: true }).limit(100);
  if (ta) q = q.eq("tahun_ajaran_id", ta.id);
  const { data } = await q;

  return (
    <>
      <PageHeader eyebrow={ta ? `TA ${ta.nama}` : undefined} title="Persetujuan" description={active.desc} />
      <div role="tablist" aria-label="Antrian" className="mb-4 inline-flex rounded-[12px] border border-line bg-surface p-1">
        {tabs.map((t, i) => (
          <Link key={t.key + t.label} role="tab" aria-selected={t === active} href={`/persetujuan?tab=${t.key}`}
            className={cn("flex items-center gap-2 rounded-[9px] px-3.5 py-2 text-[13px] font-medium", t === active ? "bg-ink text-white" : "text-ink-2 hover:text-ink")}>
            {t.label}
            <span className={cn("tabular rounded-full px-1.5 text-[11px]", t === active ? "bg-white/20" : "bg-surface-muted")}>{counts[i]}</span>
          </Link>
        ))}
      </div>
      <Card>
        {!data?.length ? (
          <EmptyState icon={CheckCheck} title="Antrian kosong" description="Tidak ada usulan yang menunggu pada tahap ini." />
        ) : (
          <Table caption={active.label}>
            <thead>
              <tr><Th>Diajukan</Th><Th>Siswa</Th><Th>Pelanggaran</Th><Th className="text-right">Poin</Th><Th>Pengusul</Th><Th>Status</Th><Th><span className="sr-only">Aksi</span></Th></tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-ink-2">{formatTanggal(r.created_at)}</Td>
                  <Td><p className="font-medium">{r.siswa_nama}</p><p className="text-[12px] text-ink-2">{r.kelas_nama} · NIS {r.nis}</p></Td>
                  <Td className="max-w-[260px]"><p className="truncate">{r.kode} {r.jenis_nama}</p><p className="text-[12px] text-ink-2">Kejadian {formatTanggal(r.tanggal_kejadian)}</p></Td>
                  <Td className="tabular text-right font-semibold">{r.poin}</Td>
                  <Td className="text-ink-2">{r.pengusul_nama}</Td>
                  <Td><StatusPelanggaranBadge status={r.status!} /></Td>
                  <Td className="text-right"><Link href={`/arsip/${r.id}`} className={buttonClass(active.key === "menunggu_persetujuan" ? "primary" : "secondary", "sm")}>{active.key === "menunggu_persetujuan" ? "Putuskan" : "Detail"}</Link></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
