import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { JALUR, STATUS_PELANGGARAN } from "@/lib/domain/types";

export const SORTABLE = ["tanggal_kejadian", "nis", "siswa_nama", "kelas_nama", "kode", "poin", "pengusul_nama", "status"] as const;
export const PAGE_SIZE = 20;

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const opt = <T extends z.ZodType>(s: T) => z.preprocess((v) => (one(v) === "" ? undefined : one(v)), s.optional());

export const arsipFilterSchema = z.object({
  q: opt(z.string().trim().max(80)),
  status: opt(z.enum(STATUS_PELANGGARAN)),
  jalur: opt(z.enum(JALUR)),
  kelas: opt(z.uuid()),
  tingkat: opt(z.coerce.number().refine((n) => [10, 11, 12].includes(n))),
  pasal: opt(z.coerce.number().int().min(1).max(99)),
  dari: opt(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  sampai: opt(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  sort: opt(z.enum(SORTABLE)),
  dir: opt(z.enum(["asc", "desc"])),
  page: opt(z.coerce.number().int().min(1).max(10000)),
});
export type ArsipFilter = z.infer<typeof arsipFilterSchema>;

export function parseArsipFilter(sp: Record<string, string | string[] | undefined>): ArsipFilter {
  const r = arsipFilterSchema.safeParse(sp);
  return r.success ? r.data : {};
}

/** Escape karakter khusus PostgREST untuk filter or()/ilike. */
function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`).replace(/[,()."]/g, " ");
}

export async function queryArsip(taId: string, f: ArsipFilter, range?: { from: number; to: number }) {
  const supabase = await createClient();
  let q = supabase
    .from("v_arsip_pelanggaran")
    .select("id, siswa_id, tanggal_kejadian, nis, siswa_nama, kelas_nama, tingkat, kode, pasal, jenis_nama, poin, pengusul_nama, status, jalur", { count: "exact" })
    .eq("tahun_ajaran_id", taId);
  if (f.q) {
    const t = escapeLike(f.q);
    q = q.or(`siswa_nama.ilike.%${t}%,nis.ilike.%${t}%,kode.ilike.%${t}%,jenis_nama.ilike.%${t}%`);
  }
  if (f.status) q = q.eq("status", f.status);
  if (f.jalur) q = q.eq("jalur", f.jalur);
  if (f.kelas) q = q.eq("kelas_id", f.kelas);
  if (f.tingkat) q = q.eq("tingkat", f.tingkat);
  if (f.pasal) q = q.eq("pasal", f.pasal);
  if (f.dari) q = q.gte("tanggal_kejadian", f.dari);
  if (f.sampai) q = q.lte("tanggal_kejadian", f.sampai);
  q = q.order(f.sort ?? "tanggal_kejadian", { ascending: (f.dir ?? "desc") === "asc", nullsFirst: false }).order("id");
  if (range) q = q.range(range.from, range.to);
  return q;
}
