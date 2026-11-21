import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlarmClock, AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, BadgeCheck, CalendarX2, ClipboardList, FilePlus2,
  FileWarning, GraduationCap, HeartHandshake, Mail, Plus, Search, X,
} from "lucide-react";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { getPeringatan, getRingkasan } from "@/lib/queries/dashboard";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { HBarList, TrendLine } from "@/components/dashboard/charts";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusTLBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn, formatAngka, formatTanggal, hariIniJakarta, tanggalPlusHari } from "@/lib/utils/format";
import { JENIS_SANKSI_LABEL, STATUS_PELANGGARAN_LABEL, type StatusPelanggaran, type UserRole } from "@/lib/domain/types";
import { PENGELOLA, PENGUSUL, STAFF } from "@/lib/permissions";
import { PortalSiswa } from "./portal-siswa";

export const metadata = { title: "Dashboard" };

const jam = (iso: string) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const hari = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso));

function aksiCepat(role: UserRole): { href: string; label: string; icon: LucideIcon }[] {
  const all = [
    { href: "/arsip/baru", label: "Catat pelanggaran", icon: FilePlus2, roles: PENGUSUL },
    { href: "/persetujuan", label: "Putuskan usulan", icon: BadgeCheck, roles: PENGELOLA },
    { href: "/tindak-lanjut", label: "Tindak lanjut", icon: ClipboardList, roles: PENGELOLA },
    { href: "/surat", label: "Buat surat", icon: Mail, roles: PENGELOLA },
    { href: "/remisi", label: "Remisi", icon: HeartHandshake, roles: ["bk", "kepala_sekolah"] as UserRole[] },
    { href: "/arsip", label: "Cari arsip", icon: Search, roles: ["guru", "kepala_sekolah"] as UserRole[] },
    { href: "/siswa", label: "Data siswa", icon: GraduationCap, roles: ["guru", "kepala_sekolah"] as UserRole[] },
  ];
  return all.filter((a) => a.roles.includes(role)).slice(0, 5);
}

const ICON: Record<StatusPelanggaran, { icon: LucideIcon; cls: string }> = {
  menunggu_persetujuan: { icon: ArrowUpRight, cls: "bg-surface-muted text-ink" },
  disetujui: { icon: ArrowUpDown, cls: "bg-surface-muted text-ink" },
  disahkan: { icon: ArrowUp, cls: "bg-danger-soft text-danger" },
  ditolak: { icon: X, cls: "bg-success-soft text-success" },
  dibatalkan: { icon: X, cls: "bg-success-soft text-success" },
};
const JUDUL: Record<StatusPelanggaran, string> = {
  menunggu_persetujuan: "Diusulkan",
  disetujui: "Disetujui",
  disahkan: "Pelanggaran sah",
  ditolak: "Usulan ditolak",
  dibatalkan: "Pelanggaran dibatalkan",
};

export default async function DashboardPage() {
  const profile = await requireRoute("dashboard");
  const ta = await getTahunAjaranTerpilih();

  if (!ta) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card>
          <EmptyState icon={CalendarX2} title="Belum ada tahun ajaran" description="Admin perlu membuat tahun ajaran terlebih dahulu di menu Tahun Ajaran." action={profile.role === "admin" ? <ButtonLink href="/master/tahun-ajaran">Buat tahun ajaran</ButtonLink> : undefined} />
        </Card>
      </>
    );
  }
  if (profile.role === "siswa" || profile.role === "orang_tua") return <PortalSiswa ta={ta} nama={profile.nama_lengkap} />;

  const supabase = await createClient();
  const isStaff = STAFF.includes(profile.role);
  const today = hariIniJakarta();
  const [r, peringatan, log, remisi, tl] = await Promise.all([
    getRingkasan(ta.id),
    getPeringatan(ta.id),
    supabase
      .from("pelanggaran_status_log")
      .select("id, status_ke, created_at, oleh:oleh(nama_lengkap), p:pelanggaran_id!inner(id, poin, tahun_ajaran_id, siswa:siswa_id(nama_lengkap), jenis:jenis_pelanggaran_id(kode, nama))")
      .eq("p.tahun_ajaran_id", ta.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("remisi").select("id, jumlah_poin, created_at, siswa:siswa_id(nama_lengkap)").gte("tanggal", ta.tanggal_mulai).lte("tanggal", ta.tanggal_selesai).order("created_at", { ascending: false }).limit(3),
    isStaff
      ? supabase.from("tindak_lanjut").select("id, jenis, status, tanggal_selesai, siswa:siswa_id(id, nama_lengkap)").in("status", ["direncanakan", "berjalan"]).lte("tanggal_selesai", tanggalPlusHari(7)).order("tanggal_selesai").limit(5)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  // Perbandingan bulan berjalan vs bulan sebelumnya (poin disahkan, data nyata).
  const tren = r.tren_bulanan;
  const bulanIni = today.slice(0, 7);
  const cur = tren.find((t) => t.bulan === bulanIni)?.poin ?? 0;
  const prevKey = tren.filter((t) => t.bulan < bulanIni).at(-1)?.bulan;
  const prev = tren.find((t) => t.bulan === prevKey)?.poin ?? 0;
  const delta = cur - prev;
  const pct = prev > 0 ? Math.round((delta / prev) * 100) : null;

  type Item = { id: string; at: string; title: string; sub: string; amount: string; amountCls: string; icon: LucideIcon; iconCls: string; href: string };
  const items: Item[] = [
    ...(log.data ?? []).map((l) => ({
      id: `l${l.id}`,
      at: l.created_at,
      title: `${JUDUL[l.status_ke]} — ${l.p?.siswa?.nama_lengkap ?? "Siswa"}`,
      sub: `${l.p?.jenis?.kode} ${l.p?.jenis?.nama} · ${l.oleh?.nama_lengkap ?? "Sistem"}`,
      amount: l.status_ke === "ditolak" || l.status_ke === "dibatalkan" ? `${l.p?.poin} poin` : `+${l.p?.poin} poin`,
      amountCls: l.status_ke === "disahkan" ? "text-danger" : l.status_ke === "ditolak" || l.status_ke === "dibatalkan" ? "text-ink-3 line-through" : "text-ink",
      icon: ICON[l.status_ke].icon,
      iconCls: ICON[l.status_ke].cls,
      href: `/arsip/${l.p?.id}`,
    })),
    ...(remisi.data ?? []).map((x) => ({
      id: `r${x.id}`,
      at: x.created_at,
      title: `Remisi — ${x.siswa?.nama_lengkap ?? "Siswa"}`,
      sub: "Pengurangan poin dengan surat pendukung",
      amount: `−${x.jumlah_poin} poin`,
      amountCls: "text-success",
      icon: ArrowDown,
      iconCls: "bg-success-soft text-success",
      href: "/remisi",
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 7);
  const groups = new Map<string, Item[]>();
  items.forEach((i) => groups.set(hari(i.at), [...(groups.get(hari(i.at)) ?? []), i]));

  const menunggu = r.menunggu_keputusan + r.menunggu_pengesahan;
  const ambangTertinggi = Math.max(0, ...peringatan.map((p) => p.ambang_poin));
  const nSkorsing = peringatan.filter((p) => p.ambang_jenis === "skorsing" || p.ambang_poin === ambangTertinggi).length;
  const statusRows: { s: StatusPelanggaran; n: number; color: string }[] = (
    [
      ["disahkan", "#0c0b0b"],
      ["menunggu_persetujuan", "#8fcf2a"],
      ["ditolak", "#c24a24"],
      ["dibatalkan", "#e8e8eb"],
    ] as const
  ).map(([s, color]) => ({ s, color, n: (r.distribusi_status.find((d) => d.status === s)?.jumlah ?? 0) + (s === "menunggu_persetujuan" ? (r.distribusi_status.find((d) => d.status === "disetujui")?.jumlah ?? 0) : 0) }));
  const totalUsulan = statusRows.reduce((a, b) => a + b.n, 0);
  const aksi = aksiCepat(profile.role);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.15fr)]">
        <Card className="flex flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px]">Total poin bersih</p>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[12px] text-ink-2">TA {ta.nama}</span>
          </div>
          <p className="tabular mt-4 text-[44px] font-semibold leading-none tracking-[-0.035em] sm:text-[52px]">{formatAngka(r.total_poin_bersih)}</p>
          <p className="mt-4 text-[13.5px]">
            <span className={cn("font-medium", delta > 0 ? "text-danger" : "text-success")}>
              {pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct}%`}
            </span>{" "}
            <span className="font-semibold">{delta > 0 ? "+" : ""}{delta} poin</span> <span className="text-ink-2">disahkan bulan ini dibanding bulan lalu</span>
          </p>
          <p className="mt-1 text-[12px] text-ink-2">{formatAngka(r.total_poin_sah)} poin disahkan − remisi. Usulan yang belum disahkan tidak dihitung.</p>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-medium tracking-[-0.015em]">Ringkasan kedisiplinan</h2>
            {PENGUSUL.includes(profile.role) && (
              <Link href="/arsip/baru" aria-label="Catat pelanggaran" className="grid size-10 place-items-center rounded-full border border-line hover:bg-surface-muted">
                <Plus className="size-[18px]" aria-hidden />
              </Link>
            )}
          </div>
          <div className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Pelanggaran sah", value: r.pelanggaran_sah, icon: FileWarning, href: "/arsip?status=disahkan" },
              { label: "Diusulkan (menunggu Tanse)", value: menunggu, icon: BadgeCheck, href: PENGELOLA.includes(profile.role) ? "/persetujuan" : "/arsip?status=menunggu_persetujuan" },
              { label: "Siswa di ambang peringatan", value: peringatan.length, icon: AlertTriangle, href: "#peringatan" },
            ].map((k) => (
              <Link key={k.label} href={k.href} className="group flex flex-col justify-between gap-4 rounded-[12px] border border-line bg-canvas-soft p-4 transition-colors hover:bg-surface-muted">
                <span className="flex items-center justify-between">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface">
                    <k.icon className="size-[18px]" aria-hidden />
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-ink" aria-hidden />
                </span>
                <span>
                  <span className="block text-[13.5px] text-ink-2">{k.label}</span>
                  <span className="tabular block text-[28px] font-semibold leading-tight tracking-[-0.02em]">{formatAngka(k.value)}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {aksi.length > 0 && (
            <Card className="p-5">
              <h2 className="text-[17px] font-medium tracking-[-0.015em]">Aksi cepat</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {aksi.map((a) => (
                  <Link key={a.href} href={a.href} className="flex flex-col items-center gap-3 rounded-[12px] border border-line px-3 py-5 text-center text-[14px] font-medium transition-colors hover:border-line-strong hover:bg-canvas-soft">
                    <span className="grid size-9 place-items-center rounded-full border border-line bg-surface">
                      <a.icon className="size-[17px]" aria-hidden />
                    </span>
                    {a.label}
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Aktivitas terbaru" action={<ButtonLink href="/arsip" variant="secondary" size="sm">Lihat semua aktivitas</ButtonLink>} />
            {items.length ? (
              <div className="px-5 pb-2 pt-3">
                {[...groups].map(([tgl, list]) => (
                  <section key={tgl} className="mb-2">
                    <h3 className="py-2 text-[13px] text-ink-2">{tgl === today ? `Hari ini, ${formatTanggal(tgl, { day: "numeric", month: "short" })}` : formatTanggal(tgl, { day: "numeric", month: "long", year: "numeric" })}</h3>
                    <ul className="divide-y divide-line">
                      {list.map((i) => (
                        <li key={i.id}>
                          <Link href={i.href} className="-mx-2 flex items-center gap-3.5 rounded-[10px] px-2 py-3 transition-colors hover:bg-canvas-soft">
                            <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", i.iconCls)}>
                              <i.icon className="size-[18px]" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14.5px] font-medium">{i.title}</span>
                              <span className="block truncate text-[13px] text-ink-2">{i.sub}</span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className={cn("tabular block text-[14.5px] font-medium", i.amountCls)}>{i.amount}</span>
                              <span className="tabular block text-[12.5px] text-ink-2">{jam(i.at)}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <EmptyState title="Belum ada aktivitas" description={`Usulan dan keputusan pada TA ${ta.nama} akan tampil di sini.`} />
            )}
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h2 className="text-[17px] font-medium tracking-[-0.015em]">Status usulan</h2>
          <div className="mt-4 rounded-[12px] border border-line">
            <div className="flex items-end justify-between gap-3 p-4">
              <div>
                <p className="text-[13px] text-ink-2">Diusulkan, menunggu Tanse</p>
                <p className="tabular text-[26px] font-semibold tracking-[-0.02em]">{menunggu}</p>
              </div>
              <p className="pb-1 text-right text-[13px] text-ink-2">dari <span className="font-medium text-ink">{totalUsulan}</span> usulan</p>
            </div>
            <div className="border-t border-line px-4 py-3">
              <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={statusRows.map((x) => `${STATUS_PELANGGARAN_LABEL[x.s]} ${x.n}`).join(", ")}>
                {statusRows.map((x) => x.n > 0 && <span key={x.s} style={{ width: `${(x.n / Math.max(1, totalUsulan)) * 100}%`, background: x.color }} />)}
              </div>
            </div>
          </div>
          <dl className="mt-4 space-y-2.5 text-[14px]">
            {statusRows.map((x) => (
              <div key={x.s} className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-2"><span className="size-2 rounded-[2px]" style={{ background: x.color }} aria-hidden />{STATUS_PELANGGARAN_LABEL[x.s]}</dt>
                <dd className="tabular font-medium">{x.n}</dd>
              </div>
            ))}
          </dl>
          {PENGELOLA.includes(profile.role) ? (
            <ButtonLink href="/persetujuan" variant="cta" className="mt-5 w-full">Putuskan usulan</ButtonLink>
          ) : PENGUSUL.includes(profile.role) ? (
            <ButtonLink href="/arsip/baru" variant="cta" className="mt-5 w-full">Catat pelanggaran</ButtonLink>
          ) : null}

          <div className="mt-6">
            <h3 className="text-[16px] font-medium">Tren poin sah</h3>
            <p className="text-[13.5px] text-ink-2">Bulan ini: <span className="font-medium text-ink">{cur} poin</span></p>
            <div className="mt-3">{tren.length ? <TrendLine data={tren} /> : <EmptyState title="Belum ada data" />}</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2 xl:col-span-1" >
          <div id="peringatan" className="scroll-mt-24" />
          <CardHeader title="Peringatan dini" description={`Ambang dari master sanksi · ${nSkorsing} di ambang tertinggi`} />
          {peringatan.length ? (
            <ol className="mt-2 px-5 pb-3">
              {peringatan.slice(0, 8).map((s) => {
                const tertinggi = s.ambang_poin === ambangTertinggi;
                return (
                  <li key={s.siswa_id} className="border-b border-line last:border-0">
                    <Link href={`/siswa/${s.siswa_id}`} className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2.5 hover:bg-canvas-soft">
                      <Avatar nama={s.nama} className="size-9" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium">{s.nama}</span><span className="block text-[12.5px] text-ink-2">{s.kelas} · NIS {s.nis}</span></span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="tabular text-[15px] font-semibold">{s.poin_bersih}</span>
                        <Badge tone={tertinggi ? "danger" : "warning"}>{s.ambang_nama}</Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : <EmptyState title="Belum ada siswa di ambang" description="Siswa ditandai otomatis saat poin bersih mencapai ambang di master tingkat sanksi." />}
        </Card>
        <Card>
          <CardHeader title="Distribusi pasal" description="Usulan sah & dalam proses" />
          <div className="p-5">{r.distribusi_pasal.length ? <HBarList rows={r.distribusi_pasal.map((d) => ({ label: `Pasal ${d.pasal}`, value: d.jumlah, sub: `${d.poin} poin` }))} /> : <EmptyState title="Belum ada data" />}</div>
        </Card>
        <Card>
          <CardHeader title="Per tingkat" description="Pelanggaran disahkan" />
          <div className="p-5">{r.per_tingkat.length ? <HBarList rows={r.per_tingkat.map((d) => ({ label: `Kelas ${d.tingkat}`, value: d.jumlah, sub: `${d.poin} poin` }))} /> : <EmptyState title="Belum ada data" />}</div>
        </Card>
        {isStaff && (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader title="Tindak lanjut jatuh tempo" description="Berakhir ≤ 7 hari atau sudah lewat" action={<ButtonLink href="/tindak-lanjut" variant="secondary" size="sm">Semua</ButtonLink>} />
            {tl.data?.length ? (
              <ul className="mt-2 grid grid-cols-1 gap-x-6 px-5 pb-3 md:grid-cols-2">
                {tl.data.map((t) => {
                  const lewat = (t.tanggal_selesai ?? "") < today;
                  return (
                    <li key={t.id} className="border-b border-line">
                      <Link href={`/siswa/${t.siswa?.id}`} className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-3 hover:bg-canvas-soft">
                        <span className={cn("grid size-9 place-items-center rounded-full", lewat ? "bg-danger-soft text-danger" : "bg-surface-muted text-ink")}><AlarmClock className="size-4" aria-hidden /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium">{t.siswa?.nama_lengkap}</span><span className="block text-[12.5px] text-ink-2">{JENIS_SANKSI_LABEL[t.jenis]} · {lewat ? "lewat" : "selesai"} {formatTanggal(t.tanggal_selesai)}</span></span>
                        <StatusTLBadge status={t.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <EmptyState title="Tidak ada yang jatuh tempo" />}
          </Card>
        )}
      </div>
    </div>
  );
}
