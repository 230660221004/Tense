import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth/session";
import { STAFF } from "@/lib/permissions";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { parseArsipFilter, queryArsip } from "@/lib/queries/arsip";
import { STATUS_PELANGGARAN_LABEL } from "@/lib/domain/types";

function csvCell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // cegah CSV formula injection
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (!STAFF.includes(profile.role)) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const ta = await getTahunAjaranTerpilih();
  if (!ta) return NextResponse.json({ error: "Tahun ajaran tidak ada" }, { status: 400 });
  const f = parseArsipFilter(Object.fromEntries(req.nextUrl.searchParams));
  const { data, error } = await queryArsip(ta.id, f, { from: 0, to: 4999 });
  if (error) return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  const header = ["Tanggal", "NIS", "Nama siswa", "Kelas", "Pasal", "Kode", "Pelanggaran", "Poin", "Pengusul", "Status"];
  const rows = (data ?? []).map((r) => [r.tanggal_kejadian, r.nis, r.siswa_nama, r.kelas_nama, r.pasal, r.kode, r.jenis_nama, r.poin, r.pengusul_nama, r.status ? STATUS_PELANGGARAN_LABEL[r.status] : ""]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="arsip-pelanggaran-${ta.nama.replace("/", "-")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
