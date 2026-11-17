export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

/** Deteksi tipe dari magic bytes — MIME dari browser tidak dipercaya. */
export function sniffMime(bytes: Uint8Array): AllowedMime | null {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return "application/pdf";
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return "image/webp";
  return null;
}

export function sanitizeFileName(name: string) {
  const base = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").replace(/^[.-]+/, "").slice(-80);
  return base || "dokumen";
}

export type FileCheck = { ok: true; mime: AllowedMime; bytes: Uint8Array; name: string } | { ok: false; message: string };

export async function checkFile(file: unknown): Promise<FileCheck> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pilih file untuk diunggah." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, message: "Ukuran file maksimal 10 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return { ok: false, message: "Format file harus PDF, JPG, PNG, atau WEBP." };
  return { ok: true, mime, bytes, name: sanitizeFileName(file.name) };
}
