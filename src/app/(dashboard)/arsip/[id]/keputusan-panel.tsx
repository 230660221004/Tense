"use client";
import { useActionState, useState } from "react";
import { revisiAction, ubahStatusAction } from "@/lib/actions/pelanggaran";
import { initialState } from "@/lib/actions/types";
import { AKSI_LABEL, CATATAN_WAJIB } from "@/lib/domain/status";
import type { StatusPelanggaran } from "@/lib/domain/types";
import { Field, FormMessage, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

type Pilihan = StatusPelanggaran | "revisi";

interface Props {
  id: string;
  aksi: StatusPelanggaran[];
  revisi?: { jenis: { id: string; pasal: number; label: string; poin: number }[]; jenisId: string; deskripsi: string } | null;
}

export function KeputusanPanel({ id, aksi, revisi }: Props) {
  const opsi: Pilihan[] = [...aksi.filter((a) => a === "disahkan"), ...(revisi ? (["revisi"] as const) : []), ...aksi.filter((a) => a !== "disahkan")];
  const [pilih, setPilih] = useState<Pilihan>(opsi[0]!);
  const [state, action] = useActionState(ubahStatusAction, initialState);
  const [rState, rAction] = useActionState(revisiAction, initialState);
  const label = (p: Pilihan) => (p === "revisi" ? "Revisi" : AKSI_LABEL[p]);

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Keputusan Tanse</legend>
        <div className="grid grid-cols-3 gap-2">
          {opsi.map((a) => (
            <label key={a} className="flex cursor-pointer items-center justify-center rounded-full border border-line-strong px-2 py-2 text-center text-[13px] has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
              <input type="radio" name="pilihan" value={a} checked={pilih === a} onChange={() => setPilih(a)} className="sr-only" />
              {label(a)}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-ink-2">
          {pilih === "disahkan" && "Poin sesuai pasal ditambahkan ke total siswa; status menjadi Sah."}
          {pilih === "revisi" && "Ubah pasal atau keterangan, lalu versi revisi langsung disahkan."}
          {pilih === "ditolak" && "Usulan tidak menambah poin; alasan penolakan disimpan."}
          {pilih === "dibatalkan" && "Catatan dibatalkan dan tidak dihitung."}
        </p>
      </fieldset>

      {pilih === "revisi" && revisi ? (
        <form action={rAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <Field label="Pasal" htmlFor="rev-jenis" error={rState.errors?.jenis_pelanggaran_id} required>
            <Select id="rev-jenis" name="jenis_pelanggaran_id" defaultValue={revisi.jenisId} required>
              {revisi.jenis.map((j) => (
                <option key={j.id} value={j.id}>Pasal {j.pasal} · {j.label} ({j.poin} poin)</option>
              ))}
            </Select>
          </Field>
          <Field label="Keterangan" htmlFor="rev-desk" error={rState.errors?.deskripsi} required>
            <Textarea id="rev-desk" name="deskripsi" rows={4} defaultValue={revisi.deskripsi} required />
          </Field>
          <Field label="Catatan revisi (opsional)" htmlFor="rev-cat">
            <Textarea id="rev-cat" name="catatan" rows={2} />
          </Field>
          <FormMessage state={rState} />
          <SubmitButton className="w-full" pendingText="Menyimpan…">Simpan revisi & sahkan</SubmitButton>
        </form>
      ) : (
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={pilih} />
          <Field label={CATATAN_WAJIB.has(pilih as StatusPelanggaran) ? "Alasan (wajib)" : "Catatan (opsional)"} htmlFor="catatan" error={state.errors?.catatan}>
            <Textarea id="catatan" name="catatan" rows={3} required={CATATAN_WAJIB.has(pilih as StatusPelanggaran)} aria-invalid={!!state.errors?.catatan} />
          </Field>
          <FormMessage state={state} />
          <SubmitButton className="w-full" variant={pilih === "ditolak" || pilih === "dibatalkan" ? "danger" : "primary"} pendingText="Memproses…">
            {label(pilih)}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
