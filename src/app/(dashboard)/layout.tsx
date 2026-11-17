import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getDaftarTahunAjaran, getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PENGUSUL } from "@/lib/permissions";
import { salamWaktu } from "@/lib/utils/format";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const isTanse = profile.role === "bk";
  const isPortal = profile.role === "siswa" || profile.role === "orang_tua";
  // Semua query layout paralel (satu putaran ke DB).
  const [daftarTA, ta, notif, setuju, anak] = await Promise.all([
    getDaftarTahunAjaran(),
    getTahunAjaranTerpilih(),
    supabase.from("notifikasi").select("id", { count: "exact", head: true }).is("dibaca_at", null),
    isTanse ? supabase.from("pelanggaran").select("id", { count: "exact", head: true }).in("status", ["menunggu_persetujuan", "disetujui"]) : null,
    isPortal ? supabase.from("siswa").select("id, nama_lengkap").order("nama_lengkap") : null,
  ]);
  const persetujuan = setuju?.count ?? 0;
  const extraLinks = (anak?.data ?? []).map((s) => ({ href: `/siswa/${s.id}`, label: s.nama_lengkap }));

  const badges = { persetujuan, notifikasi: notif.count ?? 0 };
  const cta = PENGUSUL.includes(profile.role) ? { href: "/arsip/baru", label: "Catat pelanggaran" } : null;
  return (
    <div className="flex min-h-dvh">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
        Lewati ke konten
      </a>
      <Sidebar role={profile.role} badges={badges} extraLinks={extraLinks} cta={cta} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          role={profile.role}
          nama={profile.nama_lengkap}
          email={profile.email}
          badges={badges}
          extraLinks={extraLinks}
          tahunAjaran={daftarTA.map((t) => ({ id: t.id, nama: t.nama, aktif: t.aktif }))}
          taTerpilih={ta?.id ?? null}
          salam={salamWaktu()}
          cta={cta}
        />
        <main id="konten" className="page-enter mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-7 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
