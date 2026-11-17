import Link from "next/link";
import { BellOff } from "lucide-react";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { tandaiDibacaAction } from "@/lib/actions/notifikasi";
import { formatWaktu } from "@/lib/utils/format";
import { cn } from "@/lib/utils/format";

export const metadata = { title: "Notifikasi" };

export default async function NotifikasiPage() {
  await requireRoute("notifikasi");
  const supabase = await createClient();
  const { data } = await supabase.from("notifikasi").select("id, judul, isi, tipe, tautan, dibaca_at, created_at").order("created_at", { ascending: false }).limit(100);
  const unread = (data ?? []).filter((n) => !n.dibaca_at).length;
  return (
    <>
      <PageHeader title="Notifikasi" description="Notifikasi di dalam aplikasi. Push notification belum diaktifkan (fase lanjutan)."
        actions={unread > 0 ? <form action={tandaiDibacaAction}><Button variant="secondary">Tandai semua dibaca ({unread})</Button></form> : undefined} />
      <Card>
        {!data?.length ? (
          <EmptyState icon={BellOff} title="Belum ada notifikasi" description="Anda akan menerima notifikasi saat ada usulan baru atau perubahan status." />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((n) => (
              <li key={n.id} className={cn("flex items-start gap-3 px-5 py-4", !n.dibaca_at && "bg-accent-soft/40")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.dibaca_at ? "bg-line-strong" : "bg-accent")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">{n.judul}{!n.dibaca_at && <span className="sr-only"> (belum dibaca)</span>}</p>
                  {n.isi && <p className="text-[13px] text-ink-2">{n.isi}</p>}
                  <p className="mt-0.5 text-[12px] text-ink-3">{formatWaktu(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {n.tautan && <Link href={n.tautan} className="rounded-[8px] border border-line-strong px-2.5 py-1.5 text-[12px] font-medium hover:bg-surface-muted">Buka</Link>}
                  {!n.dibaca_at && (
                    <form action={tandaiDibacaAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className="rounded-[8px] px-2.5 py-1.5 text-[12px] text-ink-2 hover:bg-surface-muted hover:text-ink">Tandai dibaca</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
