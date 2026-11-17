import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/format";

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const link = (p: number, disabled: boolean, label: string, icon: React.ReactNode) =>
    disabled ? (
      <span aria-disabled className="grid size-8 place-items-center rounded-[8px] border border-line text-ink-3">{icon}<span className="sr-only">{label}</span></span>
    ) : (
      <Link href={hrefFor(p)} className="grid size-8 place-items-center rounded-[8px] border border-line-strong text-ink hover:bg-surface-muted" aria-label={label}>{icon}</Link>
    );
  return (
    <nav aria-label="Paginasi" className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-[13px] text-ink-2">
      <span className="tabular">
        {from}–{to} dari {total}
      </span>
      <div className="flex items-center gap-1.5">
        {link(page - 1, page <= 1, "Halaman sebelumnya", <ChevronLeft className="size-4" />)}
        <span className={cn("tabular px-2 text-ink")}>
          {page} / {pages}
        </span>
        {link(page + 1, page >= pages, "Halaman berikutnya", <ChevronRight className="size-4" />)}
      </div>
    </nav>
  );
}
