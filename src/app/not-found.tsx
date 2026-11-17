import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-surface text-ink-2 shadow-card">
          <SearchX className="size-5" aria-hidden />
        </div>
        <p className="text-[13px] font-medium text-ink-2">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-ink-2">Data mungkin sudah tidak ada atau Anda tidak memiliki akses.</p>
        <ButtonLink href="/dashboard" className="mt-6">Kembali ke dashboard</ButtonLink>
      </div>
    </main>
  );
}
