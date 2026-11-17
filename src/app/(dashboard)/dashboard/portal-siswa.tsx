import Link from "next/link";
import { ArrowUpRight, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { Avatar } from "@/components/ui/avatar";
import type { Tables } from "@/lib/domain/types";

export async function PortalSiswa({ ta, nama }: { ta: Tables<"tahun_ajaran">; nama: string }) {
  const supabase = await createClient();
  const [{ data: siswa }, { data: rekap }] = await Promise.all([
    supabase.from("siswa").select("id, nama_lengkap, nis, kelas:kelas_id(nama)").order("nama_lengkap"),
    supabase.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: ta.id }),
  ]);
  return (
    <>
      <PageHeader eyebrow={`TA ${ta.nama}`} title={`Halo, ${nama.split(" ")[0]}`} description="Poin dihitung dari pelanggaran yang telah disahkan, dikurangi remisi pada tahun ajaran ini." />
      {siswa?.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {siswa.map((s) => {
            const r = rekap?.find((x) => x.siswa_id === s.id);
            return (
              <Link key={s.id} href={`/siswa/${s.id}`} className="group">
                <Card className="p-5 transition-transform duration-150 group-hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    <Avatar nama={s.nama_lengkap} className="size-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.nama_lengkap}</p>
                      <p className="text-[13px] text-ink-2">NIS {s.nis} · {s.kelas?.nama ?? "—"}</p>
                    </div>
                    <ArrowUpRight className="size-4 text-ink-3" aria-hidden />
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
                    <div><dt className="text-[12px] text-ink-2">Poin sah</dt><dd className="tabular text-xl font-semibold">{r?.total_poin ?? 0}</dd></div>
                    <div><dt className="text-[12px] text-ink-2">Remisi</dt><dd className="tabular text-xl font-semibold">−{r?.total_remisi ?? 0}</dd></div>
                    <div><dt className="text-[12px] text-ink-2">Poin bersih</dt><dd className="tabular text-xl font-semibold">{r?.poin_bersih ?? 0}</dd></div>
                  </dl>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState icon={UserRound} title="Belum ada data siswa terhubung" description="Akun Anda belum dihubungkan dengan data siswa. Hubungi admin sekolah." />
        </Card>
      )}
    </>
  );
}
