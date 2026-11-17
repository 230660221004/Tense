import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Tidak diizinkan" };

export default function TidakDiizinkan() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
          <ShieldAlert className="size-5" aria-hidden />
        </div>
        <p className="text-[13px] font-medium text-ink-2">403</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Akses tidak diizinkan</h1>
        <p className="mt-2 text-sm text-ink-2">Role akun Anda tidak memiliki kewenangan untuk membuka halaman ini. Hubungi admin sekolah bila menurut Anda ini keliru.</p>
        <ButtonLink href="/dashboard" className="mt-6">Kembali ke dashboard</ButtonLink>
      </div>
    </main>
  );
}
