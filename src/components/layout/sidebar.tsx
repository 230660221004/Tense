"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronsLeft, ChevronsRight, PlusCircle, UserRound, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { UserRole } from "@/lib/domain/types";
import { cn } from "@/lib/utils/format";
import { navForRole } from "./nav-config";

export interface SidebarProps {
  role: UserRole;
  badges: { persetujuan: number; notifikasi: number };
  extraLinks: { href: string; label: string }[];
  cta?: { href: string; label: string } | null;
}

const KEY = "sidebar-collapsed";
const listeners = new Set<() => void>();
function readCollapsed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function setCollapsedStore(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/dashboard" className="flex h-[var(--header-height)] shrink-0 items-center gap-2.5 border-b border-line px-6">
      <Image src="/brand/logo-al-azhar.png" alt="Logo Al Azhar" width={44} height={44} className="size-10 shrink-0 object-contain" />
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-[16px] font-semibold tracking-[-0.02em]">TANSE</span>
          <span className="block text-[11px] text-ink-2">Sistem Kedisiplinan</span>
        </span>
      )}
    </Link>
  );
}

function NavList({ role, badges, extraLinks, collapsed, onNavigate }: SidebarProps & { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = navForRole(role);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-4 pb-6 pt-6">
      {extraLinks.length > 0 && (
        <div className="mb-5">
          {!collapsed && <p className="px-3 pb-2.5 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-2">Poin saya</p>}
          <ul className="space-y-0.5">
            {extraLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={onNavigate} aria-current={isActive(l.href) ? "page" : undefined}
                  className={cn("flex h-11 items-center gap-3 rounded-[10px] border px-3 text-[14.5px] transition-colors", isActive(l.href) ? "border-line bg-surface font-medium text-ink shadow-raised" : "border-transparent text-[#3b3b40] hover:bg-surface/70 hover:text-ink")}>
                  <UserRound className="size-[18px] shrink-0" aria-hidden />
                  {!collapsed && <span className="truncate">{l.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          {!collapsed ? (
            <p className="px-3 pb-2.5 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-2">{g.label}</p>
          ) : (
            <div className="mx-3 mb-3 border-t border-line" />
          )}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(item.href);
              const count = item.badgeKey ? badges[item.badgeKey] : 0;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex h-11 items-center gap-3 rounded-[10px] border px-3 text-[14.5px] transition-colors duration-150",
                      active ? "border-line bg-surface font-medium text-ink shadow-raised" : "border-transparent text-[#3b3b40] hover:bg-surface/70 hover:text-ink",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {count > 0 && (
                      <span
                        className={cn(
                          "tabular ml-auto min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5",
                          "bg-ink text-white",
                          collapsed && "absolute right-1.5 top-1 ml-0 min-w-4 px-1 text-[10px] leading-4",
                        )}
                      >
                        {count > 99 ? "99+" : count}
                        <span className="sr-only"> belum ditindaklanjuti</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar(props: SidebarProps) {
  const collapsed = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readCollapsed,
    () => false,
  );
  const reduce = useReducedMotion();
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ duration: reduce ? 0 : 0.2, ease: [0.2, 0.7, 0.2, 1] }}
      className="no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-canvas-soft lg:flex"
    >
      <Brand collapsed={collapsed} />
      <NavList {...props} collapsed={collapsed} />
      <div className="space-y-2 p-4">
        {props.cta && (
          <Link href={props.cta.href} title={collapsed ? props.cta.label : undefined} className={cn("flex h-11 items-center justify-center gap-2 rounded-full border border-ink/80 bg-surface text-[14px] font-medium text-ink transition-colors hover:bg-ink hover:text-white", collapsed && "px-0")}>
            <PlusCircle className="size-[18px]" aria-hidden />
            {!collapsed && props.cta.label}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsedStore(!collapsed)}
          className={cn("flex h-9 w-full items-center gap-2 rounded-[10px] px-3 text-[13px] text-ink-2 hover:bg-surface-muted hover:text-ink", collapsed && "justify-center px-0")}
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        >
          {collapsed ? <ChevronsRight className="size-4" aria-hidden /> : <ChevronsLeft className="size-4" aria-hidden />}
          {!collapsed && "Ciutkan"}
        </button>
      </div>
    </motion.aside>
  );
}

export function MobileDrawer({ open, onClose, ...props }: SidebarProps & { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) onClose();
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <motion.div className="absolute inset-0 bg-ink/30" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.18 }} />
          <motion.aside
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-canvas-soft shadow-pop"
            initial={{ x: reduce ? 0 : -300 }}
            animate={{ x: 0 }}
            exit={{ x: reduce ? 0 : -300 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="flex items-center justify-between pr-3">
              <Brand collapsed={false} />
              <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-[10px] text-ink-2 hover:bg-surface-muted" aria-label="Tutup menu" autoFocus>
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <NavList {...props} collapsed={false} onNavigate={onClose} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
