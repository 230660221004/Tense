import "server-only";
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/** Font standar PDF hanya WinAnsi: normalisasi karakter di luar set itu. */
export function aman(t: string) {
  return t
    .replace(/[−–]/g, "-")
    .replace(/→/g, "->")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ—]/g, "");
}

export class PdfWriter {
  private constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont,
    private page: PDFPage,
    private y: number,
  ) {}
  static readonly W = 595.28;
  static readonly H = 841.89;
  static readonly M = 50;

  static async create(title: string) {
    const doc = await PDFDocument.create();
    doc.setTitle(aman(title));
    doc.setProducer("TANSE");
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([PdfWriter.W, PdfWriter.H]);
    return new PdfWriter(doc, font, bold, page, PdfWriter.H - PdfWriter.M);
  }

  private ensure(h: number) {
    if (this.y - h < PdfWriter.M) {
      this.page = this.doc.addPage([PdfWriter.W, PdfWriter.H]);
      this.y = PdfWriter.H - PdfWriter.M;
    }
  }

  private wrap(text: string, size: number, font: PDFFont, width: number) {
    const lines: string[] = [];
    for (const para of aman(text).split("\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const t = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(t, size) > width && line) {
          lines.push(line);
          line = word;
        } else line = t;
      }
      lines.push(line);
    }
    return lines;
  }

  text(t: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number; indent?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    const x = PdfWriter.M + (opts.indent ?? 0);
    for (const line of this.wrap(t, size, font, PdfWriter.W - x - PdfWriter.M)) {
      this.ensure(size * 1.45);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: rgb(...(opts.color ?? [0.05, 0.04, 0.04])) });
      this.y -= size * 1.45;
    }
    this.y -= opts.gap ?? 0;
  }

  rule(gap = 8) {
    this.ensure(gap * 2);
    this.y -= gap;
    this.page.drawLine({ start: { x: PdfWriter.M, y: this.y }, end: { x: PdfWriter.W - PdfWriter.M, y: this.y }, thickness: 0.6, color: rgb(0.85, 0.85, 0.87) });
    this.y -= gap;
  }

  /** Baris tabel sederhana dengan lebar kolom relatif. */
  row(cells: string[], widths: number[], opts: { bold?: boolean; size?: number } = {}) {
    const size = opts.size ?? 9;
    const font = opts.bold ? this.bold : this.font;
    const total = PdfWriter.W - 2 * PdfWriter.M;
    const cols = cells.map((c, i) => this.wrap(c, size, font, (widths[i]! / 100) * total - 6));
    const h = Math.max(...cols.map((c) => c.length)) * size * 1.35 + 4;
    this.ensure(h);
    let x = PdfWriter.M;
    cols.forEach((lines, i) => {
      lines.forEach((l, j) => this.page.drawText(l, { x, y: this.y - size - j * size * 1.35, size, font, color: rgb(0.05, 0.04, 0.04) }));
      x += (widths[i]! / 100) * total;
    });
    this.y -= h;
    this.page.drawLine({ start: { x: PdfWriter.M, y: this.y + 1 }, end: { x: PdfWriter.W - PdfWriter.M, y: this.y + 1 }, thickness: 0.4, color: rgb(0.9, 0.9, 0.92) });
  }

  watermark(t: string) {
    for (const p of this.doc.getPages()) {
      p.drawText(aman(t), { x: 120, y: 380, size: 54, font: this.bold, color: rgb(0.76, 0.29, 0.14), opacity: 0.15, rotate: degrees(30) });
    }
  }

  async bytes() {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => p.drawText(`Halaman ${i + 1} dari ${pages.length}`, { x: PdfWriter.W - PdfWriter.M - 80, y: 25, size: 8, font: this.font, color: rgb(0.45, 0.45, 0.47) }));
    return this.doc.save();
  }
}

export function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]+/g, "-")}"`,
      "Cache-Control": "no-store",
    },
  });
}
