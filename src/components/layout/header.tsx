"use client";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, Menu, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { logoutAction, pilihTahunAjaranAction } from "@/lib/actions/auth";
import { ROLE_LABEL, type UserRole } from "@/lib/domain/types";
import { Avatar } from "@/components/ui/avatar";
import { MobileDrawer, type SidebarProps } from "./sidebar";

interface HeaderProps extends SidebarProps {
  nama: string;
  email: string | null;
  role: UserRole;
  tahunAjaran: { id: string; nama: string; aktif: boolean }[];
  taTerpilih: string | null;
  salam: string;
}

export function Header(props: HeaderProps) {
  const { nama, email, role, tahunAjaran, taTerpilih, badges, salam } = props;
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex h-[var(--header-height)] items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80 sm:px-6 lg:px-7">
        <button type="button" onClick={() => setDrawer(true)} className="grid size-10 place-items-center rounded-[10px] text-ink hover:bg-surface lg:hidden" aria-label="Buka menu">
          <Menu className="size-5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold tracking-[-0.02em] sm:text-[20px]">
            {salam}, {nama.split(/[ ,]/)[0]}
          </p>
          <p className="hidden truncate text-[13.5px] text-ink-2 sm:block">Berikut ringkasan kedisiplinan siswa hari ini.</p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {tahunAjaran.length > 0 && (
            <form action={(fd) => startTransition(() => pilihTahunAjaranAction(fd))}>
              <label htmlFor="ta-select" className="sr-only">Tahun ajaran</label>
              <select
                id="ta-select"
                name="ta_id"
                defaultValue={taTerpilih ?? undefined}
                disabled={pending}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="hidden h-10 rounded-full border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:border-line-strong focus:border-accent focus:outline-none sm:block"
              >
                {tahunAjaran.map((t) => (
                  <option key={t.id} value={t.id}>
                    TA {t.nama}
                    {t.aktif ? " (aktif)" : ""}
                  </option>
                ))}
              </select>
            </form>
          )}

          <Link href="/notifikasi" className="relative grid size-11 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-surface-muted" aria-label={`Notifikasi, ${badges.notifikasi} belum dibaca`}>
            <Bell className="size-[18px]" aria-hidden />
            {badges.notifikasi > 0 && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-danger ring-2 ring-surface" aria-hidden />}
          </Link>

          <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />
          <div className="relative" ref={menuRef}>
            <button type="button" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu} className="flex h-12 items-center gap-3 rounded-full pl-1 pr-2 hover:bg-surface-muted">
              <Avatar nama={nama} className="size-10" />
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-44 truncate text-[15px] font-medium">{nama}</span>
                <span className="block text-[12.5px] text-ink-2">{ROLE_LABEL[role]}</span>
              </span>
              <ChevronDown className="size-4 text-ink-2" aria-hidden />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 top-14 z-40 w-60 rounded-[14px] border border-line bg-surface p-1.5 shadow-pop">
                <div className="px-3 py-2">
                  <p className="truncate text-[13px] font-semibold">{nama}</p>
                  <p className="truncate text-[12px] text-ink-2">{email}</p>
                </div>
                <div className="my-1 border-t border-line" />
                <Link role="menuitem" href="/pengaturan" onClick={() => setMenu(false)} className="flex h-9 items-center gap-2.5 rounded-[8px] px-3 text-[13px] hover:bg-surface-muted">
                  <Settings className="size-4 text-ink-2" aria-hidden /> Pengaturan akun
                </Link>
                <form action={logoutAction}>
                  <button role="menuitem" type="submit" className="flex h-9 w-full items-center gap-2.5 rounded-[8px] px-3 text-[13px] text-danger hover:bg-danger-soft">
                    <LogOut className="size-4" aria-hidden /> Keluar
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>
      <MobileDrawer {...props} open={drawer} onClose={closeDrawer} />
    </>
  );
}
