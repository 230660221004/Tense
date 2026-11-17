import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

const APP_NAME = "Tanse";
const APP_TAGLINE = "Sistem arsip poin pelanggaran siswa";
const LOGO_ALT = "Yayasan Pesantren Islam Al Azhar, Yayasan Syiar Bangsa, dan Sekolah Islam Al Azhar Summarecon";

/** Pola bintang segi delapan (dua persegi bersilang), ornamen geometris khas arsitektur Islam. */
function Lattice({ id, origin }: { id: string; origin: string }) {
  const mask = `radial-gradient(130% 100% at ${origin}, #000 0%, transparent 72%)`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <svg className="size-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={id} width="80" height="80" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="1">
              <rect x="14" y="14" width="52" height="52" />
              <rect x="14" y="14" width="52" height="52" transform="rotate(45 40 40)" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

const chip = "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[13px] font-medium text-white/90";

/** Alur nyata aplikasi: usulan → keputusan Tanse → sah. Warna titik sama dengan status di dashboard. */
function AlurPersetujuan() {
  return (
    <ol aria-label="Alur persetujuan pelanggaran" className="flex flex-wrap items-center gap-2">
      <li className={chip}><span className="size-1.5 rounded-full bg-[#f2a31b]" aria-hidden />Diusulkan</li>
      <li aria-hidden className="h-px w-5 bg-white/30" />
      <li className={chip}><span className="size-1.5 rounded-full bg-white/70" aria-hidden />Diputuskan {APP_NAME}</li>
      <li aria-hidden className="h-px w-5 bg-white/30" />
      <li className={chip}><span className="size-1.5 rounded-full bg-[#4ade80]" aria-hidden />Sah</li>
    </ol>
  );
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const alasan = typeof sp.alasan === "string" ? sp.alasan : undefined;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(480px,560px)]">
      {/* Panel merek (desktop) */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0d3577] to-[#071f4a] p-12 text-white lg:flex xl:p-16">
        <Lattice id="tanse-lattice-desktop" origin="100% 100%" />

        <div className="relative">
          <Image src="/brand/logo-al-azhar.png" alt={LOGO_ALT} width={1600} height={308} priority className="h-auto w-full max-w-[300px]" />
        </div>

        <div className="relative max-w-xl">
          <p className="text-[48px] font-semibold leading-none tracking-[-0.045em]">{APP_NAME}</p>
          <p className="mt-3 text-[15px] text-white/70">{APP_TAGLINE}</p>

          <p className="mt-12 max-w-[20ch] text-[30px] font-medium leading-[1.2] tracking-[-0.02em]">
            Catatan kedisiplinan yang rapi, terlacak, dan adil.
          </p>
          <div className="mt-8">
            <AlurPersetujuan />
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">
            Setiap perubahan status tercatat: siapa yang mengubah, kapan, dan mengapa.
          </p>
        </div>

        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Sekolah Islam Al Azhar Summarecon Bandung</p>
      </section>

      {/* Formulir */}
      <section className="flex flex-col justify-center bg-surface px-6 py-10 sm:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-sm">
          {/* Banner merek (mobile & tablet) */}
          <div className="relative mb-10 overflow-hidden rounded-[14px] bg-gradient-to-br from-[#0d3577] to-[#071f4a] px-5 py-6 text-white lg:hidden">
            <Lattice id="tanse-lattice-mobile" origin="100% 100%" />
            <Image src="/brand/logo-al-azhar.png" alt={LOGO_ALT} width={1600} height={308} priority className="relative h-auto w-full max-w-[240px]" />
            <p className="relative mt-5 text-[22px] font-semibold leading-none tracking-[-0.03em]">{APP_NAME}</p>
            <p className="relative mt-1.5 text-[13px] text-white/70">{APP_TAGLINE}</p>
          </div>

          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink">Masuk ke {APP_NAME}</h1>
          <p className="mt-2 text-sm text-ink-2">Gunakan akun yang diberikan admin sekolah.</p>

          {alasan === "sesi" && (
            <p role="status" className="mt-5 rounded-[10px] border border-warning/25 bg-warning-soft px-3 py-2 text-[13px] text-warning">
              Sesi berakhir atau akun tidak aktif. Silakan masuk kembali.
            </p>
          )}

          <LoginForm next={next} />

          <div className="mt-8 space-y-3 border-t border-line pt-6 text-[13px] leading-relaxed text-ink-2">
            <p>Lupa password atau belum punya akun? Hubungi admin sekolah.</p>
            <p className="flex items-start gap-2">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Data siswa bersifat rahasia dan hanya dapat dibuka sesuai peran akun Anda.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
