import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileSearch, Plus, X } from "lucide-react";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { PAGE_SIZE, parseArsipFilter, queryArsip, type ArsipFilter } from "@/lib/queries/arsip";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusPelanggaranBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { Avatar } from "@/components/ui/avatar";
import { JALUR, JALUR_LABEL, STATUS_PELANGGARAN, STATUS_PELANGGARAN_LABEL } from "@/lib/domain/types";
import { formatTanggal } from "@/lib/utils/format";
import { PENGUSUL, STAFF } from "@/lib/permissions";

export const metadata = { title: "Arsip Pelanggaran" };

function qs(f: ArsipFilter, patch: Partial<Record<keyof ArsipFilter, string | number | undefined>>) {
  const p = new URLSearchParams();
  const merged = { ...f, ...patch } as Record<string, unknown>;
  for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && v !== null) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function ArsipPage({ searchParams }: PageProps<"/arsip">) {
  const profile = await requireRoute("arsip");
  const ta = await getTahunAjaranTerpilih();
  const f = parseArsipFilter(await searchParams);
  const page = f.page ?? 1;
  const supabase = await createClient();

  if (!ta) return <EmptyState title="Belum ada tahun ajaran" />;

  const [{ data, count, error }, { data: kelas }, { data: jenis }] = await Promise.all([
    queryArsip(ta.id, f, { from: (page - 1) * PAGE_SIZE, to: page * PAGE_SIZE - 1 }),
    supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).order("tingkat").order("nama"),
    supabase.from("jenis_pelanggaran").select("pasal"),
  ]);
  const pasalList = [...new Set((jenis ?? []).map((j) => j.pasal))].sort((a, b) => a - b);
  const aktifFilter = Object.entries(f).filter(([k, v]) => !["sort", "dir", "page"].includes(k) && v !== undefined).length;

  const sortHead = (key: NonNullable<ArsipFilter["sort"]>, label: string, className?: string) => {
    const active = (f.sort ?? "tanggal_kejadian") === key;
    const dir = active ? (f.dir ?? "desc") : undefined;
    const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <Th className={className} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
        <Link href={qs(f, { sort: key, dir: active && dir === "desc" ? "asc" : "desc", page: undefined })} className="inline-flex items-center gap-1 hover:text-ink">
          {label}
          <Icon className="size-3.5" aria-hidden />
        </Link>
      </Th>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow={`TA ${ta.nama}${profile.role === "guru" ? " · usulan Anda & kelas perwalian" : ""}`}
        title="Arsip Pelanggaran"
        description="Seluruh catatan pelanggaran beserta status persetujuannya."
        actions={
          <>
            {STAFF.includes(profile.role) && (
              <a href={`/api/arsip/export${qs(f, { page: undefined })}`} className={buttonClass("secondary")}>
                <Download className="size-4" aria-hidden /> Ekspor CSV
              </a>
            )}
            {PENGUSUL.includes(profile.role) && (
              <ButtonLink href="/arsip/baru">
                <Plus className="size-4" aria-hidden /> Catat pelanggaran
              </ButtonLink>
            )}
          </>
        }
      />

      <Card>
        <form method="get" className="grid grid-cols-2 gap-3 border-b border-line p-4 sm:p-5 md:grid-cols-4 xl:grid-cols-8" aria-label="Filter arsip">
          <div className="col-span-2 md:col-span-4 xl:col-span-2">
            <label htmlFor="q" className="sr-only">Cari</label>
            <Input id="q" name="q" defaultValue={f.q} placeholder="Cari nama, NIS, kode…" />
          </div>
          <FilterSelect name="status" label="Status" value={f.status} options={STATUS_PELANGGARAN.map((s) => [s, STATUS_PELANGGARAN_LABEL[s]])} />
          <FilterSelect name="kelas" label="Kelas" value={f.kelas} options={(kelas ?? []).map((k) => [k.id, k.nama])} />
          <FilterSelect name="tingkat" label="Tingkat" value={f.tingkat?.toString()} options={[["10", "Kelas 10"], ["11", "Kelas 11"], ["12", "Kelas 12"]]} />
          <FilterSelect name="pasal" label="Pasal" value={f.pasal?.toString()} options={pasalList.map((n) => [String(n), `Pasal ${n}`])} />
          <FilterSelect name="jalur" label="Jalur" value={f.jalur} options={JALUR.map((j) => [j, JALUR_LABEL[j]])} />
          <div className="flex gap-2">
            <label htmlFor="dari" className="sr-only">Dari tanggal</label>
            <Input id="dari" type="date" name="dari" defaultValue={f.dari} title="Dari tanggal" />
          </div>
          <div className="flex gap-2">
            <label htmlFor="sampai" className="sr-only">Sampai tanggal</label>
            <Input id="sampai" type="date" name="sampai" defaultValue={f.sampai} title="Sampai tanggal" />
          </div>
          {f.sort && <input type="hidden" name="sort" value={f.sort} />}
          {f.dir && <input type="hidden" name="dir" value={f.dir} />}
          <div className="col-span-2 flex items-center gap-2 md:col-span-4 xl:col-span-8">
            <button type="submit" className={buttonClass("primary", "sm")}>Terapkan filter</button>
            {aktifFilter > 0 && (
              <Link href="/arsip" className={buttonClass("ghost", "sm")}>
                <X className="size-3.5" aria-hidden /> Hapus filter ({aktifFilter})
              </Link>
            )}
            <span className="tabular ml-auto text-[13px] text-ink-2">{count ?? 0} catatan</span>
          </div>
        </form>

        {error ? (
          <ErrorState message="Arsip tidak dapat dimuat. Periksa koneksi lalu coba lagi." />
        ) : !data?.length ? (
          <EmptyState
            icon={FileSearch}
            title={aktifFilter ? "Tidak ada hasil" : "Arsip masih kosong"}
            description={aktifFilter ? "Coba ubah kata kunci atau hapus sebagian filter." : "Catatan pelanggaran muncul di sini setelah guru atau BK membuat usulan melalui tombol “Catat pelanggaran”."}
            action={aktifFilter ? <ButtonLink href="/arsip" variant="secondary">Hapus filter</ButtonLink> : PENGUSUL.includes(profile.role) ? <ButtonLink href="/arsip/baru">Catat pelanggaran</ButtonLink> : undefined}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table caption="Daftar arsip pelanggaran">
                <thead>
                  <tr>
                    {sortHead("tanggal_kejadian", "Tanggal")}
                    {sortHead("siswa_nama", "Siswa")}
                    {sortHead("kelas_nama", "Kelas")}
                    {sortHead("kode", "Pelanggaran")}
                    {sortHead("poin", "Poin", "text-right")}
                    {sortHead("pengusul_nama", "Pengusul")}
                    {sortHead("status", "Status")}
                    <Th><span className="sr-only">Aksi</span></Th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <Tr key={r.id}>
                      <Td className="tabular whitespace-nowrap text-ink-2">{formatTanggal(r.tanggal_kejadian)}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar nama={r.siswa_nama ?? "?"} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{r.siswa_nama}</p>
                            <p className="tabular text-[12px] text-ink-2">NIS {r.nis}</p>
                          </div>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap">{r.kelas_nama ?? "—"}</Td>
                      <Td className="max-w-[280px]">
                        <p className="truncate"><span className="font-medium">{r.kode}</span> <span className="text-ink-2">· Psl {r.pasal}</span></p>
                        <p className="truncate text-[12px] text-ink-2">{r.jenis_nama}</p>
                      </Td>
                      <Td className="tabular text-right font-semibold">{r.poin}</Td>
                      <Td className="max-w-[160px] truncate text-ink-2">{r.pengusul_nama ?? "—"}</Td>
                      <Td><StatusPelanggaranBadge status={r.status!} /></Td>
                      <Td className="text-right">
                        <Link href={`/arsip/${r.id}`} className={buttonClass("secondary", "sm")}>Detail</Link>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {data.map((r) => (
                <li key={r.id}>
                  <Link href={`/arsip/${r.id}`} className="block px-4 py-3.5 active:bg-surface-muted">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.siswa_nama}</p>
                        <p className="text-[12px] text-ink-2">NIS {r.nis} · {r.kelas_nama ?? "—"} · {formatTanggal(r.tanggal_kejadian)}</p>
                      </div>
                      <span className="tabular shrink-0 font-semibold">+{r.poin}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="truncate text-[13px] text-ink-2">{r.kode} {r.jenis_nama}</p>
                      <StatusPelanggaranBadge status={r.status!} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => `/arsip${qs(f, { page: p })}`} />
          </>
        )}
      </Card>
    </>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string | undefined; options: [string, string][] }) {
  return (
    <div>
      <label htmlFor={`flt-${name}`} className="sr-only">{label}</label>
      <Select id={`flt-${name}`} name={name} defaultValue={value ?? ""}>
        <option value="">{label}: semua</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </Select>
    </div>
  );
}
