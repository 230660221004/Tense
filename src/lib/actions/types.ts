export interface ActionState {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}
export const initialState: ActionState = { ok: false, message: "" };

/** Ubah error Postgres/Supabase menjadi pesan aman berbahasa Indonesia. */
export function pesanError(error: { message?: string; code?: string } | null | undefined, fallback = "Terjadi kesalahan. Coba lagi.") {
  if (!error) return fallback;
  if (error.code === "42501" && error.message?.includes("row-level security")) return "Anda tidak memiliki izin untuk aksi ini.";
  if (error.code === "23505") return "Data duplikat: nilai unik sudah dipakai.";
  if (error.code === "23503") return "Data masih dirujuk oleh data lain atau rujukan tidak valid.";
  // Pesan dari RAISE EXCEPTION kita sudah berbahasa Indonesia & aman ditampilkan.
  if (error.code && ["42501", "22023", "P0002"].includes(error.code) && error.message) return error.message;
  return fallback;
}

export function zodErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "_");
    out[k] ??= i.message;
  }
  return out;
}
