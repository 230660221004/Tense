import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/domain/types";
import { canAccess, type RouteKey } from "@/lib/permissions";

export interface SessionProfile {
  id: string;
  email: string | null;
  nama_lengkap: string;
  role: UserRole;
  no_hp: string | null;
}

/**
 * Sesi terverifikasi (tanda tangan JWT dicek lokal via JWKS, tanpa roundtrip Auth) +
 * profil dari DB — role & status aktif TIDAK diambil dari client/JWT.
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nama_lengkap, role, no_hp, aktif")
    .eq("id", sub)
    .maybeSingle();
  if (!profile || !profile.aktif) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: profile.id, email, nama_lengkap: profile.nama_lengkap, role: profile.role, no_hp: profile.no_hp };
});

export async function requireProfile() {
  const p = await getSessionProfile();
  if (!p) redirect("/login?alasan=sesi");
  return p;
}

export async function requireRoute(route: RouteKey) {
  const p = await requireProfile();
  if (!canAccess(p.role, route)) redirect("/tidak-diizinkan");
  return p;
}

export async function requireRole(roles: readonly UserRole[]) {
  const p = await requireProfile();
  if (!roles.includes(p.role)) redirect("/tidak-diizinkan");
  return p;
}
