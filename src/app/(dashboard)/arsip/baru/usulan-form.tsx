"use client";
import { useActionState, useMemo, useState } from "react";
import { buatPelanggaranAction } from "@/lib/actions/pelanggaran";
import { initialState } from "@/lib/actions/types";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

interface Props {
  today: string;
  langsung: boolean;
  defaultSiswa?: string | undefined;
  siswa: { id: string; label: string; kelas: string; tingkat: number }[];
  jenis: { id: string; pasal: number; label: string; poin: number }[];
}

export function UsulanForm({ today, langsung, defaultSiswa, siswa, jenis }: Props) {
  const [state, action] = useActionState(buatPelanggaranAction, initialState);
  const [jenisId, setJenisId] = useState("");
  const byKelas = useMemo(() => {
    const m = new Map<string, Props["siswa"]>();
    [...siswa].sort((a, b) => a.tingkat - b.tingkat || a.kelas.localeCompare(b.kelas)).forEach((s) => m.set(s.kelas, [...(m.get(s.kelas) ?? []), s]));
    return [...m];
  }, [siswa]);
  const poin = jenis.find((j) => j.id === jenisId)?.poin;
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <Field label="Siswa" htmlFor="siswa_id" error={e.siswa_id} required>
        <Select id="siswa_id" name="siswa_id" defaultValue={defaultSiswa ?? ""} required aria-invalid={!!e.siswa_id}>
          <option value="">— Pilih siswa —</option>
          {byKelas.map(([kelas, list]) => (
            <optgroup key={kelas} label={kelas}>
              {list.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
        <Field label="Pasal tata tertib" htmlFor="jenis_pelanggaran_id" error={e.jenis_pelanggaran_id} required>
          <Select id="jenis_pelanggaran_id" name="jenis_pelanggaran_id" value={jenisId} onChange={(ev) => setJenisId(ev.target.value)} required aria-invalid={!!e.jenis_pelanggaran_id}>
            <option value="">— Pilih pasal —</option>
            {jenis.map((j) => (
              <option key={j.id} value={j.id}>Pasal {j.pasal} · {j.label} ({j.poin} poin)</option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Bobot poin</span>
          <output htmlFor="jenis_pelanggaran_id" className="tabular flex h-10 items-center rounded-[10px] bg-surface-muted px-3 text-sm font-semibold" aria-live="polite">
            {poin !== undefined ? `${poin} poin` : "—"}
          </output>
          <span className="text-[12px] text-ink-2">Diambil dari master, bukan input.</span>
        </div>
      </div>
      <Field label="Tanggal kejadian" htmlFor="tanggal_kejadian" error={e.tanggal_kejadian} required>
        <Input id="tanggal_kejadian" name="tanggal_kejadian" type="date" max={today} defaultValue={today} required className="sm:max-w-[220px]" aria-invalid={!!e.tanggal_kejadian} />
      </Field>
      <Field label="Keterangan" htmlFor="deskripsi" error={e.deskripsi} required hint="Tuliskan waktu, tempat, dan saksi bila ada.">
        <Textarea id="deskripsi" name="deskripsi" rows={5} required aria-invalid={!!e.deskripsi} />
      </Field>
      <Field label="Bukti (opsional)" htmlFor="bukti" hint="PDF/JPG/PNG/WEBP, maks. 10 MB. Disimpan privat.">
        <Input id="bukti" name="bukti" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-[13px] file:font-medium" />
      </Field>
      <FormMessage state={state} />
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton pendingText="Menyimpan…">{langsung ? "Simpan (langsung sah)" : "Kirim usulan"}</SubmitButton>
      </div>
    </form>
  );
}
