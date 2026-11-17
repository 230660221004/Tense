import Link from "next/link";
import { Pencil } from "lucide-react";

export function EditLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} scroll={false} className="inline-flex items-center gap-1 rounded-[8px] border border-line-strong px-2.5 py-1.5 text-[12px] font-medium hover:bg-surface-muted" aria-label={`Ubah ${label}`}>
      <Pencil className="size-3.5" aria-hidden /> Ubah
    </Link>
  );
}
