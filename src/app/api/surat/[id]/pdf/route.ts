import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PdfWriter, pdfResponse } from "@/lib/pdf";
import { formatTanggal } from "@/lib/utils/format";

/** Unduh surat/berita acara sebagai PDF. Akses mengikuti RLS tabel surat. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/surat/[id]/pdf">) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  const supabase = await createClient();
  const { data: s } = await supabase.from("surat").select("*, siswa:siswa_id(nama_lengkap, nis)").eq("id", id).maybeSingle();
  if (!s) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const pdf = await PdfWriter.create(s.judul);
  pdf.text("BIMBINGAN KONSELING & KESISWAAN", { size: 11, bold: true });
  pdf.text("Dokumen dihasilkan TANSE", { size: 8.5, color: [0.4, 0.4, 0.42] });
  pdf.rule(10);
  pdf.text(`Nomor   : ${s.nomor_surat ?? "(belum bernomor — draft)"}`);
  pdf.text(`Perihal : ${s.judul}`);
  pdf.text(`Siswa   : ${s.siswa?.nama_lengkap} (NIS ${s.siswa?.nis})`, { gap: 12 });
  pdf.text(s.isi, { size: 10.5, gap: 30 });
  pdf.text(s.difinalisasi_pada ? formatTanggal(s.difinalisasi_pada, { day: "numeric", month: "long", year: "numeric" }) : "........................", { indent: 330 });
  pdf.text("Guru BK / Tanse", { indent: 330, gap: 50 });
  pdf.text("( nama & tanda tangan manual )", { indent: 330, size: 8.5, color: [0.4, 0.4, 0.42] });
  if (s.status !== "final") pdf.watermark(s.status === "draft" ? "DRAFT - BELUM SAH" : "DIBATALKAN");
  return pdfResponse(await pdf.bytes(), `${s.nomor_surat ?? `draft-${s.id.slice(0, 8)}`}.pdf`);
}
