import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { canAccess } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { PdfWriter, pdfResponse } from "@/lib/pdf";
import { JALUR_LABEL, JENIS_SANKSI_LABEL, STATUS_PELANGGARAN_LABEL, STATUS_TL_LABEL } from "@/lib/domain/types";
import { formatTanggal, formatWaktu } from "@/lib/utils/format";

/** Satu PDF riwayat lengkap per siswa — hanya Tanse (BK/Kesiswaan) & admin. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/siswa/[id]/riwayat-pdf">) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (!canAccess(profile.role, "riwayatPdf")) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const supabase = await createClient();
  const ta = await getTahunAjaranTerpilih();
  const { data: s } = await supabase.from("siswa").select("id, nis, nisn, nama_lengkap, jenis_kelamin, kelas_id, status, profile_id, nama_orang_tua, kelas:kelas_id(nama, wali:wali_kelas_id(nama_lengkap))").eq("id", id).maybeSingle();
  if (!s) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const [rekap, pel, remisi, tl] = await Promise.all([
    ta ? supabase.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: ta.id, p_siswa_id: id }) : Promise.resolve({ data: [] }),
    supabase.from("pelanggaran").select("id, tanggal_kejadian, poin, status, jalur, deskripsi, catatan_keputusan, disahkan_pada, ta:tahun_ajaran_id(nama), jenis:jenis_pelanggaran_id(pasal, nama), pengusul:pengusul_id(nama_lengkap), pemutus:diputuskan_oleh(nama_lengkap)").eq("siswa_id", id).order("tanggal_kejadian"),
    supabase.from("remisi").select("tanggal, jumlah_poin, keterangan, pencatat:dicatat_oleh(nama_lengkap)").eq("siswa_id", id).order("tanggal"),
    supabase.from("tindak_lanjut").select("tanggal, tanggal_selesai, jenis, status, total_poin_saat_dibuat, keterangan").eq("siswa_id", id).order("tanggal"),
  ]);
  const r = rekap.data?.[0];
  const ids = (pel.data ?? []).map((p) => p.id);
  const { data: log } = ids.length
    ? await supabase.from("pelanggaran_status_log").select("pelanggaran_id, status_ke, catatan, created_at, oleh:oleh(nama_lengkap)").in("pelanggaran_id", ids).order("created_at")
    : { data: [] };

  const pdf = await PdfWriter.create(`Riwayat poin ${s.nama_lengkap}`);
  pdf.text("RIWAYAT POIN PELANGGARAN SISWA", { size: 14, bold: true });
  pdf.text(`Dicetak ${formatWaktu(new Date().toISOString())} oleh ${profile.nama_lengkap}`, { size: 8.5, color: [0.4, 0.4, 0.42], gap: 6 });
  pdf.rule();
  pdf.text(`Nama: ${s.nama_lengkap}`, { bold: true });
  pdf.text(`NIS ${s.nis}  ·  NISN ${s.nisn ?? "-"}  ·  Kelas ${s.kelas?.nama ?? "-"}  ·  Wali kelas ${s.kelas?.wali?.nama_lengkap ?? "-"}`);
  pdf.text(`Orang tua/wali: ${s.nama_orang_tua ?? "-"}`, { gap: 6 });
  pdf.text(`Rekap TA ${ta?.nama ?? "-"}: poin sah ${r?.total_poin ?? 0}  ·  remisi ${r?.total_remisi ?? 0}  ·  poin bersih ${r?.poin_bersih ?? 0}`, { bold: true, gap: 4 });
  pdf.text("Poin hanya dihitung dari pelanggaran berstatus Sah, dikurangi remisi pada rentang tahun ajaran.", { size: 8.5, color: [0.4, 0.4, 0.42] });

  pdf.rule();
  pdf.text("Pelanggaran", { size: 11.5, bold: true, gap: 4 });
  const W = [12, 11, 30, 7, 12, 28];
  pdf.row(["Tanggal", "TA", "Pasal & keterangan", "Poin", "Status", "Pengusul / keputusan"], W, { bold: true });
  for (const p of pel.data ?? []) {
    pdf.row(
      [
        formatTanggal(p.tanggal_kejadian),
        p.ta?.nama ?? "-",
        `Pasal ${p.jenis?.pasal} ${p.jenis?.nama}${p.deskripsi ? ` — ${p.deskripsi}` : ""}`,
        p.status === "disahkan" ? `+${p.poin}` : `(${p.poin})`,
        `${STATUS_PELANGGARAN_LABEL[p.status]}${p.jalur === "langsung" ? " (langsung)" : ""}`,
        `${p.pengusul?.nama_lengkap ?? "-"} / ${p.pemutus?.nama_lengkap ?? "-"}${p.catatan_keputusan ? `: ${p.catatan_keputusan}` : ""}`,
      ],
      W,
    );
  }
  if (!pel.data?.length) pdf.text("Tidak ada catatan.", { size: 9 });

  pdf.rule();
  pdf.text("Remisi", { size: 11.5, bold: true, gap: 4 });
  for (const x of remisi.data ?? []) pdf.row([formatTanggal(x.tanggal), `-${x.jumlah_poin}`, x.keterangan, x.pencatat?.nama_lengkap ?? "-"], [14, 8, 56, 22]);
  if (!remisi.data?.length) pdf.text("Tidak ada remisi.", { size: 9 });

  pdf.rule();
  pdf.text("Tindak lanjut", { size: 11.5, bold: true, gap: 4 });
  for (const t of tl.data ?? []) pdf.row([`${formatTanggal(t.tanggal)} – ${formatTanggal(t.tanggal_selesai)}`, JENIS_SANKSI_LABEL[t.jenis], STATUS_TL_LABEL[t.status], `snapshot ${t.total_poin_saat_dibuat ?? 0}`, t.keterangan ?? ""], [22, 18, 12, 12, 36]);
  if (!tl.data?.length) pdf.text("Tidak ada tindak lanjut.", { size: 9 });

  pdf.rule();
  pdf.text("Riwayat keputusan", { size: 11.5, bold: true, gap: 4 });
  const nama = new Map((pel.data ?? []).map((p) => [p.id, `Pasal ${p.jenis?.pasal} (${formatTanggal(p.tanggal_kejadian)})`]));
  for (const l of log ?? []) pdf.row([formatWaktu(l.created_at), nama.get(l.pelanggaran_id) ?? "-", STATUS_PELANGGARAN_LABEL[l.status_ke], `${l.oleh?.nama_lengkap ?? "Sistem"}${l.catatan ? `: ${l.catatan}` : ""}`], [20, 22, 14, 44]);
  pdf.text(`Jalur: ${Object.values(JALUR_LABEL).join(" / ")}.`, { size: 8, color: [0.45, 0.45, 0.47] });

  return pdfResponse(await pdf.bytes(), `riwayat-${s.nis}.pdf`);
}
