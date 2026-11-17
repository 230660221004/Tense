import { cn, inisial } from "@/lib/utils/format";

const palette = ["bg-[#ece8ff] text-[#3f22c9]", "bg-[#e9eee7] text-[#3d4b3a]", "bg-[#f7e9e4] text-[#8f4a37]", "bg-[#efefef] text-[#3a3a3a]"];

export function Avatar({ nama, className }: { nama: string; className?: string }) {
  const idx = [...nama].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
  return (
    <span aria-hidden className={cn("inline-grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold", palette[idx], className)}>
      {inisial(nama) || "?"}
    </span>
  );
}
