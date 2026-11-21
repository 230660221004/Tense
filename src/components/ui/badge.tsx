import { cn } from "@/lib/utils/format";
import type { StatusPelanggaran, StatusRemisiPengajuan, StatusSurat, StatusTindakLanjut } from "@/lib/domain/types";
import { STATUS_PELANGGARAN_LABEL, STATUS_REMISI_LABEL, STATUS_SURAT_LABEL, STATUS_TL_LABEL } from "@/lib/domain/types";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-2",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};
// Bentuk penanda berbeda per nada → status tidak dibedakan warna saja.
const marks: Record<Tone, string> = {
  neutral: "rounded-full border border-current bg-transparent",
  success: "rounded-full bg-current",
  warning: "rounded-[2px] bg-current rotate-45",
  danger: "rounded-[1px] bg-current",
  info: "rounded-full bg-current ring-2 ring-current/25",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium", tones[tone], className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0", marks[tone])} />
      {children}
    </span>
  );
}

const pelTone: Record<StatusPelanggaran, Tone> = {
  menunggu_persetujuan: "warning",
  disetujui: "info",
  disahkan: "success",
  ditolak: "danger",
  dibatalkan: "neutral",
};
export function StatusPelanggaranBadge({ status }: { status: StatusPelanggaran }) {
  return <Badge tone={pelTone[status]}>{STATUS_PELANGGARAN_LABEL[status]}</Badge>;
}
const tlTone: Record<StatusTindakLanjut, Tone> = { direncanakan: "info", berjalan: "warning", selesai: "success", dibatalkan: "neutral" };
export function StatusTLBadge({ status }: { status: StatusTindakLanjut }) {
  return <Badge tone={tlTone[status]}>{STATUS_TL_LABEL[status]}</Badge>;
}
const suratTone: Record<StatusSurat, Tone> = { draft: "warning", final: "success", dibatalkan: "neutral" };
export function StatusSuratBadge({ status }: { status: StatusSurat }) {
  return <Badge tone={suratTone[status]}>{STATUS_SURAT_LABEL[status]}</Badge>;
}

const remisiTone: Record<StatusRemisiPengajuan, Tone> = {
  diajukan: "warning", perlu_perbaikan: "info", direkomendasikan: "info", disetujui: "success", ditolak_tanse: "danger", ditolak_kepsek: "danger",
};
export function StatusRemisiBadge({ status }: { status: StatusRemisiPengajuan }) {
  return <Badge tone={remisiTone[status]}>{STATUS_REMISI_LABEL[status]}</Badge>;
}
