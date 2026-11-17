import Link from "next/link";
import { Mail } from "lucide-react";
import { requireRoute } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTahunAjaranTerpilih } from "@/lib/queries/tahun-ajaran";
import { opsiSiswa } from "@/lib/queries/options";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusSuratBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Disclosure } from "@/components/ui/disclosure";
import { ActionForm } from "@/components/forms/action-form";
import { buttonClass } from "@/components/ui/button";
import { buatDraftSuratAction } from "@/lib/actions/surat";
import { JENIS_SURAT_LABEL } from "@/lib/domain/types";
import { formatTanggal } from "@/lib/utils/format";
import { PENGELOLA } from "@/lib/permissions";

export const metadata = { title: "Surat" };

export default async function SuratPage({ searchParams }: PageProps<"/surat">) {
  const profile = await requireRoute("surat");
  const sp = await searchParams;
  const ta = await getTahunAjaranTerpilih();
  const supabase = await createClient();
  const kelola = PENGELOLA.includes(profile.role);
  const [{ data }, { data: templates }, siswa] = await Promise.all([
    supabase.from("surat").select("id, judul, jenis, status, nomor_surat, created_at, difinalisasi_pada, siswa:siswa_id(id, nama_lengkap), pembuat:dibuat_oleh(nama_lengkap)").order("created_at", { ascending: false }).limit(200),
    supabase.from("template_surat").select("jenis, judul").eq("aktif", true),
    kelola ? opsiSiswa(ta?.id) : Promise.resolve([]),
  ]);
  return (
    <>
      <PageHeader title="Surat" description="Draft dibuat dari template; nomor surat unik diberikan saat finalisasi. Tanda tangan dilakukan manual setelah dicetak." />
      {kelola && (
        <div className="mb-4">
          <Disclosure summary="Buat draft surat" defaultOpen={typeof sp.siswa === "string"}>
            {templates?.length ? (
              <ActionForm
                action={buatDraftSuratAction}
                submitLabel="Buat draft"
                fields={[
                  { name: "siswa_id", label: "Siswa", type: "select", required: true, options: siswa, defaultValue: typeof sp.siswa === "string" ? sp.siswa : null, span: 2 },
                  { name: "jenis", label: "Template", type: "select", required: true, options: templates.map((t) => ({ value: t.jenis, label: `${t.judul} (${JENIS_SURAT_LABEL[t.jenis]})` })) },
                  { name: "keterangan", label: "Keterangan tambahan", type: "textarea", hint: "Mengisi placeholder {{keterangan}} pada template." },
                ]}
              />
            ) : (
              <EmptyState title="Belum ada template aktif" description="Admin perlu menambahkan template di Master › Template Surat." />
            )}
          </Disclosure>
        </div>
      )}
      <Card>
        {!data?.length ? (
          <EmptyState icon={Mail} title="Belum ada surat" />
        ) : (
          <Table caption="Daftar surat">
            <thead><tr><Th>Nomor</Th><Th>Judul</Th><Th>Siswa</Th><Th>Dibuat</Th><Th>Status</Th><Th><span className="sr-only">Aksi</span></Th></tr></thead>
            <tbody>
              {data.map((s) => (
                <Tr key={s.id}>
                  <Td className="tabular whitespace-nowrap">{s.nomor_surat ?? <span className="text-ink-3">—</span>}</Td>
                  <Td><p className="font-medium">{s.judul}</p><p className="text-[12px] text-ink-2">{JENIS_SURAT_LABEL[s.jenis]}</p></Td>
                  <Td><Link href={`/siswa/${s.siswa?.id}`} className="hover:underline">{s.siswa?.nama_lengkap}</Link></Td>
                  <Td className="text-ink-2"><p>{formatTanggal(s.created_at)}</p><p className="text-[12px]">{s.pembuat?.nama_lengkap}</p></Td>
                  <Td><StatusSuratBadge status={s.status} /></Td>
                  <Td className="text-right"><Link href={`/surat/${s.id}`} className={buttonClass("secondary", "sm")}>Buka</Link></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
