import type { JenisSanksi, StatusPelanggaran } from "./types";

export interface PoinItem {
  poin: number;
  status: StatusPelanggaran;
}
export interface RemisiItem {
  jumlah_poin: number;
}
export interface Ambang {
  id: string;
  nama: string;
  jenis: JenisSanksi;
  ambang_poin: number;
  aktif: boolean;
}

/** Hanya status 'disahkan' yang dihitung (definisi sama dengan public._poin_bersih). */
export function hitungPoin(items: PoinItem[], remisi: RemisiItem[]) {
  const total = items.filter((i) => i.status === "disahkan").reduce((s, i) => s + i.poin, 0);
  const totalRemisi = remisi.reduce((s, r) => s + r.jumlah_poin, 0);
  return { total, totalRemisi, bersih: total - totalRemisi };
}

/** Ambang sanksi tertinggi yang telah dicapai + ambang berikutnya (dibaca dari tingkat_sanksi). */
export function posisiAmbang(poinBersih: number, ambang: Ambang[]) {
  const aktif = ambang.filter((a) => a.aktif).sort((a, b) => a.ambang_poin - b.ambang_poin);
  const tercapai = [...aktif].reverse().find((a) => poinBersih >= a.ambang_poin) ?? null;
  const berikutnya = aktif.find((a) => poinBersih < a.ambang_poin) ?? null;
  return { tercapai, berikutnya };
}
