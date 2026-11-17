import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/format";

export function Table({ children, className, caption }: { children: ReactNode; className?: string; caption?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}
export function Th({ className, ...p }: ComponentProps<"th">) {
  return <th scope="col" className={cn("h-10 border-b border-line bg-surface px-4 text-[12px] font-medium text-ink-2 first:pl-5 last:pr-5", className)} {...p} />;
}
export function Td({ className, ...p }: ComponentProps<"td">) {
  return <td className={cn("h-14 border-b border-line px-4 text-ink first:pl-5 last:pr-5", className)} {...p} />;
}
export function Tr({ className, ...p }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors duration-100 hover:bg-[#fafafb]", className)} {...p} />;
}
