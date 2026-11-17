import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const TA_COOKIE = "ta_id";

export const getDaftarTahunAjaran = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tahun_ajaran").select("*").order("tanggal_mulai", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
});

/** Tahun ajaran terpilih: cookie user → tahun ajaran aktif → terbaru. */
export const getTahunAjaranTerpilih = cache(async () => {
  const daftar = await getDaftarTahunAjaran();
  const fromCookie = (await cookies()).get(TA_COOKIE)?.value;
  return daftar.find((t) => t.id === fromCookie) ?? daftar.find((t) => t.aktif) ?? daftar[0] ?? null;
});
