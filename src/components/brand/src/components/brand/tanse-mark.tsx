/**
 * Lambang Tanse: bintang segi delapan (dua persegi bersilang, motif geometris Islam)
 * sebagai stempel pengesahan, dengan huruf T di tengahnya.
 * variant="color": untuk latar terang. variant="light": untuk latar biru tua.
 */
export function TanseMark({
  variant = "color",
  className,
  title,
}: {
  variant?: "color" | "light";
  className?: string;
  /** Isi hanya jika lambang berdiri sendiri tanpa teks "Tanse" di dekatnya. */
  title?: string;
}) {
  const star = variant === "color" ? "#0b2f6b" : "#ffffff";
  const letter = variant === "color" ? "#ffffff" : "#0b2f6b";
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g fill={star} stroke={star} strokeWidth="3" strokeLinejoin="round">
        <rect x="11" y="11" width="42" height="42" />
        <rect x="11" y="11" width="42" height="42" transform="rotate(45 32 32)" />
      </g>
      <path fill={letter} d="M20 21H44V27H35V45H29V27H20Z" />
    </svg>
  );
}
