import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { hariIniJakarta } from "@/lib/utils/format";
import { UsulanForm } from "./usulan-form";

export const metadata = { title: "Catat pelanggaran" };

export default async function BaruPage({ searchParams }: PageProps<"/arsip/baru">) {
  const profile = await requireRoute("arsipBaru");
  const sp = await searchParams;
  const ta = await getTahunAjaranTerpilih();
  const supabase = await createClient();
  const [{ data: siswa }, { data: jenis }] = await Promise.all([
    supabase.from("siswa").select("id, nis, nama_lengkap, kelas:kelas_id(nama, tingkat, tahun_ajaran_id)").eq("status", "aktif").order("nama_lengkap"),
    supabase.from("jenis_pelanggaran").select("id, pasal, kode, nama, bobot_poin").eq("aktif", true).order("pasal").order("kode"),
  ]);
  const siswaTA = (siswa ?? []).filter((s) => !ta || s.kelas?.tahun_ajaran_id === ta.id);
  return (
    <>
      <PageHeader
        eyebrow="Arsip / Catat pelanggaran"
        title="Catat pelanggaran"
        description={profile.role === "guru" ? "Status awal “Diusulkan”. Poin belum bertambah sampai Tanse menyetujui." : "Input langsung Tanse: untuk kasus yang Anda temukan sendiri, poin langsung sah tanpa tahap usulan."}
      />
      <Card className="max-w-3xl p-5 sm:p-6">
        {!siswaTA.length || !jenis?.length ? (
          <EmptyState title="Data master belum lengkap" description="Pastikan ada siswa aktif di kelas tahun ajaran ini dan jenis pelanggaran aktif." />
        ) : (
          <UsulanForm
            today={hariIniJakarta()}
            langsung={profile.role !== "guru"}
            defaultSiswa={typeof sp.siswa === "string" ? sp.siswa : undefined}
            siswa={siswaTA.map((s) => ({ id: s.id, label: `${s.nama_lengkap} — ${s.nis}`, kelas: s.kelas?.nama ?? "Tanpa kelas", tingkat: s.kelas?.tingkat ?? 0 }))}
            jenis={jenis.map((j) => ({ id: j.id, pasal: j.pasal, label: j.nama, poin: j.bobot_poin }))}
          />
        )}
      </Card>
    </>
  );
}
