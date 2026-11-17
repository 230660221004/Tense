const tz = "Asia/Jakarta";

export function formatTanggal(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  const d = value.length === 10 ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { timeZone: tz, ...opts }).format(d);
}

export function formatWaktu(value: string | null | undefined) {
  return formatTanggal(value, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatAngka(n: number | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(n ?? 0);
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function inisial(nama: string) {
  return nama
    .replace(/[,.].*$/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

export function bulanPendek(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(y!, m! - 1, 1));
}

export function hariIniJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

/** Isi placeholder {{kunci}} template surat. Kunci tak dikenal dibiarkan apa adanya. */
export function isiTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) => (k in data ? data[k]! : m));
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Tanggal (YYYY-MM-DD, Asia/Jakarta) n hari dari sekarang. */
export function tanggalPlusHari(n: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(Date.now() + n * 86400000));
}

export function salamWaktu() {
  const jam = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}
