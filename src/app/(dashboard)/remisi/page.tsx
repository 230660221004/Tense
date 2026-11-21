import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Disclosure } from "@/components/ui/disclosure";
import { StatusRemisiBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/forms/action-form";
import {
  ajukanRemisiAction,
  perbaikiRemisiAction,
  putuskanRemisiAction,
  verifikasiRemisiAction,
  tarikRemisiAction,
  ubahRemisiAction,
} from "@/lib/actions/remisi";
import { formatTanggal } from "@/lib/utils/format";
import { PEMUTUS_REMISI, PENGAJU_REMISI, PENGELOLA } from "@/lib/permissions";
import { STATUS_REMISI_AKTIF } from "@/lib/domain/types";

export const metadata = { title: "Remisi" };

export default async function RemisiPage() {
  const profile = await requireRoute("remisi");
  const ta = await getTahunAjaranTerpilih();
  const supabase = await createClient();
  const pengaju = PENGAJU_REMISI.includes(profile.role);
  const tanse = PENGELOLA.includes(profile.role);
  const kepsek = PEMUTUS_REMISI.includes(profile.role);

  let qRemisi = supabase.from("remisi").select("id, jumlah_poin, keterangan, tanggal, surat_dokumen_id, siswa:siswa_id(id, nama_lengkap, nis), pencatat:dicatat_oleh(nama_lengkap)").order("tanggal", { ascending: false }).limit(200);
  if (ta) qRemisi = qRemisi.gte("tanggal", ta.tanggal_mulai).lte("tanggal", ta.tanggal_selesai);

  const [{ data: remisi }, { data: pengajuan }, { data: anak }] = await Promise.all([
    qRemisi,
    supabase
      .from("remisi_pengajuan")
      .select("id, status, alasan, dokumen_id, created_at, poin_rekomendasi, catatan_tanse, poin_disahkan, catatan_kepsek, diajukan_oleh, siswa:siswa_id(id, nama_lengkap, nis), pengaju:diajukan_oleh(nama_lengkap)")
      .order("created_at", { ascending: false })
      .limit(100),
    pengaju ? supabase.from("siswa").select("id, nama_lengkap, nis").order("nama_lengkap") : Promise.resolve({ data: [] as { id: string; nama_lengkap: string; nis: string }[] }),
  ]);

  const daftar = pengajuan ?? [];
  const antrianTanse = daftar.filter((p) => p.status === "diajukan");
  const antrianKepsek = daftar.filter((p) => p.status === "direkomendasikan");
  const lainnya = daftar.filter((p) => !(tanse && p.status === "diajukan") && !(kepsek && p.status === "direkomendasikan"));
  const adaAktif = daftar.some((p) => STATUS_REMISI_AKTIF.includes(p.status) && p.diajukan_oleh === profile.id);

  return (
    <>
      <PageHeader
        eyebrow={ta ? `TA ${ta.nama}` : undefined}
        title="Remisi"
        description="Alur: siswa/orang tua mengajukan dengan surat pendukung → Tanse memverifikasi dan merekomendasikan → kepala sekolah memutuskan. Poin baru berkurang setelah disetujui."
      />

      {pengaju && (
        <div className="mb-4">
          <Disclosure summary="Ajukan remisi" defaultOpen={!adaAktif && !daftar.length}>
            {!anak?.length ? (
              <p className="text-[13px] text-ink-2">Akun Anda belum terhubung dengan data siswa.</p>
            ) : (
              <ActionForm
                action={ajukanRemisiAction}
                resetOnSuccess
                submitLabel="Kirim pengajuan"
                fields={[
                  { name: "siswa_id", label: "Siswa", type: "select", required: true, options: anak.map((s) => ({ value: s.id, label: `${s.nama_lengkap} — ${s.nis}` })), defaultValue: anak.length === 1 ? anak[0]!.id : null, span: 2 },
                  { name: "alasan", label: "Alasan pengajuan", type: "textarea", required: true, span: 2 },
                  { name: "file", label: "Surat pendukung", type: "file", required: true, hint: "PDF/JPG/PNG/WEBP, maks. 10 MB. Disimpan sebagai dokumen privat.", span: 2 },
                ]}
              />
            )}
          </Disclosure>
        </div>
      )}

      {tanse && (
        <section className="mb-6" aria-labelledby="h-tanse">
          <h2 id="h-tanse" className="mb-2 text-[15px] font-semibold">Menunggu verifikasi Tanse ({antrianTanse.length})</h2>
          {!antrianTanse.length ? (
            <Card><EmptyState icon={HeartHandshake} title="Antrian kosong" description="Tidak ada pengajuan remisi yang menunggu verifikasi." /></Card>
          ) : (
            <div className="space-y-3">
              {antrianTanse.map((p) => (
                <Card key={p.id} className="p-4">
                  <KartuPengajuan p={p} />
                  <div className="mt-3">
                    <Disclosure summary="Verifikasi">
                      <ActionForm
                        action={verifikasiRemisiAction}
                        hidden={{ id: p.id }}
                        submitLabel="Simpan verifikasi"
                        fields={[
                          { name: "aksi", label: "Keputusan verifikasi", type: "select", required: true, options: [{ value: "rekomendasi", label: "Rekomendasikan ke kepala sekolah" }, { value: "perbaikan", label: "Minta perbaikan" }, { value: "tolak", label: "Tolak" }], span: 2 },
                          { name: "poin", label: "Poin yang direkomendasikan", type: "number", min: 1, hint: "Wajib bila direkomendasikan; tidak boleh melebihi poin bersih siswa." },
                          { name: "catatan", label: "Catatan", type: "textarea", hint: "Wajib untuk perbaikan atau penolakan.", span: 2 },
                        ]}
                      />
                    </Disclosure>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {kepsek && (
        <section className="mb-6" aria-labelledby="h-kepsek">
          <h2 id="h-kepsek" className="mb-2 text-[15px] font-semibold">Menunggu keputusan kepala sekolah ({antrianKepsek.length})</h2>
          {!antrianKepsek.length ? (
            <Card><EmptyState icon={HeartHandshake} title="Antrian kosong" description="Tidak ada remisi yang menunggu keputusan." /></Card>
          ) : (
            <div className="space-y-3">
              {antrianKepsek.map((p) => (
                <Card key={p.id} className="p-4">
                  <KartuPengajuan p={p} />
                  <div className="mt-3">
                    <Disclosure summary="Putuskan">
                      <ActionForm
                        action={putuskanRemisiAction}
                        hidden={{ id: p.id }}
                        submitLabel="Simpan keputusan"
                        fields={[
                          { name: "keputusan", label: "Keputusan", type: "select", required: true, options: [{ value: "setuju", label: "Setujui" }, { value: "tolak", label: "Tolak" }] },
                          { name: "poin", label: "Poin disahkan", type: "number", min: 1, defaultValue: p.poin_rekomendasi, hint: "Kosongkan untuk memakai rekomendasi Tanse." },
                          { name: "catatan", label: "Catatan", type: "textarea", hint: "Wajib bila menolak.", span: 2 },
                        ]}
                      />
                    </Disclosure>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {(pengaju || lainnya.length > 0) && (
        <section className="mb-6" aria-labelledby="h-aju">
          <h2 id="h-aju" className="mb-2 text-[15px] font-semibold">{pengaju ? "Pengajuan saya" : "Pengajuan lainnya"}</h2>
          {!lainnya.length ? (
            <Card><EmptyState icon={HeartHandshake} title="Belum ada pengajuan" description="Pengajuan remisi dan statusnya akan tampil di sini." /></Card>
          ) : (
            <div className="space-y-3">
              {lainnya.map((p) => {
                const milikSaya = pengaju && p.diajukan_oleh === profile.id;
                return (
                  <Card key={p.id} className="p-4">
                    <KartuPengajuan p={p} />

                    {milikSaya && p.status === "perlu_perbaikan" && (
                      <div className="mt-3">
                        <Disclosure summary="Perbaiki pengajuan" defaultOpen>
                          <ActionForm
                            action={perbaikiRemisiAction}
                            hidden={{ id: p.id }}
                            submitLabel="Kirim perbaikan"
                            fields={[
                              { name: "alasan", label: "Alasan pengajuan", type: "textarea", required: true, defaultValue: p.alasan, span: 2 },
                              { name: "file", label: "Surat pendukung baru (opsional)", type: "file", hint: "Kosongkan untuk tetap memakai surat sebelumnya.", span: 2 },
                            ]}
                          />
                        </Disclosure>
                      </div>
                    )}

                    {milikSaya && p.status === "diajukan" && (
                      <div className="mt-3">
                        <Disclosure summary="Ubah pengajuan">
                          <ActionForm
                            action={ubahRemisiAction}
                            hidden={{ id: p.id }}
                            submitLabel="Simpan perubahan"
                            fields={[
                              { name: "alasan", label: "Alasan pengajuan", type: "textarea", required: true, defaultValue: p.alasan, span: 2 },
                              { name: "file", label: "Surat pendukung baru (opsional)", type: "file", hint: "Kosongkan untuk tetap memakai surat sebelumnya.", span: 2 },
                            ]}
                          />
                        </Disclosure>
                      </div>
                    )}

                    {milikSaya && (p.status === "diajukan" || p.status === "perlu_perbaikan") && (
                      <div className="mt-3">
                        <Disclosure summary="Tarik pengajuan">
                          <ActionForm
                            action={tarikRemisiAction}
                            hidden={{ id: p.id }}
                            submitLabel="Tarik pengajuan"
                            fields={[
                              { name: "konfirmasi", label: "Konfirmasi", type: "select", required: true, options: [{ value: "ya", label: "Ya, tarik pengajuan ini" }], span: 2 },
                            ]}
                          />
                        </Disclosure>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      <h2 className="mb-2 text-[15px] font-semibold">Remisi yang berlaku</h2>
      <Card>
        {!remisi?.length ? (
          <EmptyState icon={HeartHandshake} title="Belum ada remisi" description="Remisi yang disetujui pada tahun ajaran ini akan tampil di sini." />
        ) : (
          <Table caption="Daftar remisi">
            <thead><tr><Th>Tanggal</Th><Th>Siswa</Th><Th>Alasan</Th><Th className="text-right">Poin</Th><Th>Disahkan oleh</Th><Th>Bukti</Th></tr></thead>
            <tbody>
              {remisi.map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-ink-2">{formatTanggal(r.tanggal)}</Td>
                  <Td>{profile.role === "siswa" || profile.role === "orang_tua" ? <span className="font-medium">{r.siswa?.nama_lengkap}</span> : <Link href={`/siswa/${r.siswa?.id}`} className="font-medium hover:underline">{r.siswa?.nama_lengkap}</Link>}<p className="text-[12px] text-ink-2">NIS {r.siswa?.nis}</p></Td>
                  <Td className="max-w-[360px]"><p className="line-clamp-2">{r.keterangan}</p></Td>
                  <Td className="tabular text-right font-semibold text-success">−{r.jumlah_poin}</Td>
                  <Td className="text-ink-2">{r.pencatat?.nama_lengkap}</Td>
                  <Td><a href={`/api/dokumen/${r.surat_dokumen_id}`} className="text-[13px] font-medium underline">Unduh</a></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

type Pengajuan = {
  id: string; status: import("@/lib/domain/types").StatusRemisiPengajuan; alasan: string; dokumen_id: string; created_at: string;
  poin_rekomendasi: number | null; catatan_tanse: string | null; poin_disahkan: number | null; catatan_kepsek: string | null;
  siswa: { id: string; nama_lengkap: string; nis: string } | null; pengaju: { nama_lengkap: string } | null;
};

function KartuPengajuan({ p }: { p: Pengajuan }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{p.siswa?.nama_lengkap} <span className="text-[12px] font-normal text-ink-2">NIS {p.siswa?.nis}</span></p>
          <p className="text-[12px] text-ink-2">Diajukan {formatTanggal(p.created_at)} oleh {p.pengaju?.nama_lengkap}</p>
        </div>
        <StatusRemisiBadge status={p.status} />
      </div>
      <p className="text-[13px]">{p.alasan}</p>
      <p className="text-[13px]"><a href={`/api/dokumen/${p.dokumen_id}`} className="font-medium underline">Unduh surat pendukung</a></p>
      {p.poin_rekomendasi != null && <p className="text-[13px] text-ink-2">Rekomendasi Tanse: <span className="tabular font-semibold">{p.poin_rekomendasi} poin</span></p>}
      {p.catatan_tanse && <p className="text-[13px] text-ink-2">Catatan Tanse: {p.catatan_tanse}</p>}
      {p.poin_disahkan != null && <p className="text-[13px] text-ink-2">Poin disahkan: <span className="tabular font-semibold">{p.poin_disahkan}</span></p>}
      {p.catatan_kepsek && <p className="text-[13px] text-ink-2">Catatan kepala sekolah: {p.catatan_kepsek}</p>}
    </div>
  );
}