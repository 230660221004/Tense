import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { opsiSiswa } from "@/lib/queries/options";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusTLBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Disclosure } from "@/components/ui/disclosure";
import { ActionForm } from "@/components/forms/action-form";
import { buatTindakLanjutAction, ubahStatusTLAction } from "@/lib/actions/tindak-lanjut";
import { JENIS_SANKSI, JENIS_SANKSI_LABEL, STATUS_TINDAK_LANJUT, STATUS_TL_LABEL } from "@/lib/domain/types";
import { formatTanggal, hariIniJakarta } from "@/lib/utils/format";
import { PENGELOLA } from "@/lib/permissions";
import { cn } from "@/lib/utils/format";

export const metadata = { title: "Tindak lanjut" };

export default async function TindakLanjutPage({ searchParams }: PageProps<"/tindak-lanjut">) {
  const profile = await requireRoute("tindakLanjut");
  const sp = await searchParams;
  const status = STATUS_TINDAK_LANJUT.find((s) => s === sp.status);
  const ta = await getTahunAjaranTerpilih();
  const supabase = await createClient();
  let q = supabase.from("tindak_lanjut").select("id, jenis, tanggal, tanggal_selesai, status, total_poin_saat_dibuat, keterangan, siswa:siswa_id(id, nama_lengkap, nis), sanksi:tingkat_sanksi_id(nama, ambang_poin), pembuat:dibuat_oleh(nama_lengkap)").order("tanggal", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const [{ data }, { data: sanksi }, siswa] = await Promise.all([
    q,
    supabase.from("tingkat_sanksi").select("id, nama, jenis, ambang_poin").eq("aktif", true).order("ambang_poin"),
    PENGELOLA.includes(profile.role) ? opsiSiswa(ta?.id) : Promise.resolve([]),
  ]);
  const today = hariIniJakarta();
  const kelola = PENGELOLA.includes(profile.role);

  return (
    <>
      <PageHeader title="Tindak lanjut" description="Sanksi dan pembinaan. Poin saat dibuat disimpan sebagai snapshot." />
      {typeof sp.galat === "string" && <p role="alert" className="mb-4 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">{sp.galat}</p>}
      {kelola && (
        <div className="mb-4">
          <Disclosure summary="Buat tindak lanjut" defaultOpen={typeof sp.siswa === "string"}>
            <ActionForm
              action={buatTindakLanjutAction}
              resetOnSuccess
              submitLabel="Buat tindak lanjut"
              fields={[
                { name: "siswa_id", label: "Siswa", type: "select", required: true, options: siswa, defaultValue: typeof sp.siswa === "string" ? sp.siswa : null, span: 2 },
                { name: "tingkat_sanksi_id", label: "Tingkat sanksi (ambang)", type: "select", options: (sanksi ?? []).map((s) => ({ value: s.id, label: `${s.nama} — ambang ${s.ambang_poin}` })), placeholder: "— Tanpa ambang —" },
                { name: "jenis", label: "Jenis", type: "select", required: true, options: JENIS_SANKSI.map((j) => ({ value: j, label: JENIS_SANKSI_LABEL[j] })) },
                { name: "tanggal", label: "Tanggal mulai", type: "date", required: true, defaultValue: today },
                { name: "tanggal_selesai", label: "Tanggal selesai", type: "date" },
                { name: "keterangan", label: "Keterangan", type: "textarea", required: true, span: 2 },
              ]}
            />
          </Disclosure>
        </div>
      )}
      <nav aria-label="Filter status" className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...STATUS_TINDAK_LANJUT].map((s) => (
          <Link key={s ?? "semua"} href={s ? `/tindak-lanjut?status=${s}` : "/tindak-lanjut"} aria-current={status === s ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1.5 text-[13px]", status === s ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:text-ink")}>
            {s ? STATUS_TL_LABEL[s] : "Semua"}
          </Link>
        ))}
      </nav>
      <Card>
        {!data?.length ? (
          <EmptyState icon={ClipboardList} title="Belum ada tindak lanjut" description={kelola ? "Buat tindak lanjut ketika poin siswa mencapai ambang sanksi." : undefined} />
        ) : (
          <Table caption="Daftar tindak lanjut">
            <thead><tr><Th>Siswa</Th><Th>Sanksi</Th><Th>Periode</Th><Th className="text-right">Snapshot poin</Th><Th>Pembuat</Th><Th>Status</Th>{kelola && <Th>Ubah status</Th>}</tr></thead>
            <tbody>
              {data.map((t) => {
                const lewat = t.tanggal_selesai && t.tanggal_selesai < today && ["direncanakan", "berjalan"].includes(t.status);
                return (
                  <Tr key={t.id}>
                    <Td><Link href={`/siswa/${t.siswa?.id}`} className="font-medium hover:underline">{t.siswa?.nama_lengkap}</Link><p className="text-[12px] text-ink-2">NIS {t.siswa?.nis}</p></Td>
                    <Td><p>{t.sanksi?.nama ?? JENIS_SANKSI_LABEL[t.jenis]}</p><p className="max-w-[260px] truncate text-[12px] text-ink-2">{t.keterangan}</p></Td>
                    <Td className="whitespace-nowrap">{formatTanggal(t.tanggal)} – {formatTanggal(t.tanggal_selesai)}{lewat && <p className="text-[12px] font-medium text-danger">Melewati tanggal selesai</p>}</Td>
                    <Td className="tabular text-right font-semibold">{t.total_poin_saat_dibuat ?? 0}</Td>
                    <Td className="text-ink-2">{t.pembuat?.nama_lengkap ?? "—"}</Td>
                    <Td><StatusTLBadge status={t.status} /></Td>
                    {kelola && (
                      <Td>
                        {["direncanakan", "berjalan"].includes(t.status) ? (
                          <form action={ubahStatusTLAction} className="flex gap-1.5">
                            <input type="hidden" name="id" value={t.id} />
                            <label htmlFor={`st-${t.id}`} className="sr-only">Status baru</label>
                            <select id={`st-${t.id}`} name="status" defaultValue={t.status} className="h-8 rounded-[8px] border border-line-strong bg-surface px-2 text-[12px]">
                              {STATUS_TINDAK_LANJUT.map((s) => <option key={s} value={s}>{STATUS_TL_LABEL[s]}</option>)}
                            </select>
                            <button className="h-8 rounded-[8px] bg-ink px-2.5 text-[12px] font-medium text-white">Simpan</button>
                          </form>
                        ) : <span className="text-[12px] text-ink-3">Final</span>}
                      </Td>
                    )}
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
