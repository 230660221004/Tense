import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL wajib berupa URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diisi"),
});

let cached: z.infer<typeof publicSchema> | null = null;

/** Env publik (aman untuk browser). Melempar error jelas bila belum diset. */
export function publicEnv() {
  if (cached) return cached;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      `Konfigurasi environment tidak valid: ${parsed.error.issues.map((i) => i.message).join("; ")}. Lihat .env.example.`,
    );
  }
  cached = parsed.data;
  return cached;
}
