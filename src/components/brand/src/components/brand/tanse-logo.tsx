import { TanseMark } from "./tanse-mark";

/**
 * Lambang + nama untuk header sidebar. Menghasilkan fragment, jadi cukup diletakkan
 * di dalam <Link> yang sudah ada.
 */
export function TanseLogo({
  collapsed = false,
  subtitle = "Sistem Kedisiplinan",
}: {
  collapsed?: boolean;
  subtitle?: string;
}) {
  return (
    <>
      <TanseMark className="size-10 shrink-0" />
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-[18px] font-semibold tracking-[-0.03em] text-ink">Tanse</span>
          <span className="block text-[11px] text-ink-2">{subtitle}</span>
        </span>
      )}
    </>
  );
}
