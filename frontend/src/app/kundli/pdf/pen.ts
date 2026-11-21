/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Small layout toolkit on top of pdfkit. Two jobs:
 *  1. Draw mixed Hindi + English text correctly: Devanagari runs use the Devanagari font (with real
 *     conjunct shaping), everything else uses the Latin font, all placed on one common baseline.
 *  2. Provide page furniture (branded header / footer), tables and cards with automatic page breaks.
 * The same code runs in the browser (standalone pdfkit) and in Node (tests).
 */
export type Doc = any;

export const PAGE = { w: 595.28, h: 841.89 };
export const MARGIN = 40;
export const COLORS = {
  saffron: '#D9730D',
  maroon: '#7B1E1E',
  gold: '#B8862B',
  ink: '#2B2118',
  muted: '#6B5B4B',
  faint: '#9A8A78',
  tint: '#FFF7E8',
  tint2: '#FBEFD6',
  line: '#E6D2A6',
  green: '#2E7D4F',
  red: '#B3261E',
  amber: '#B7791F',
  white: '#FFFFFF',
};

export interface FontSet {
  latin: ArrayBuffer | Uint8Array;
  latinBold: ArrayBuffer | Uint8Array;
  deva: ArrayBuffer | Uint8Array;
  devaBold: ArrayBuffer | Uint8Array;
}

const DEVA_RUN = /([ऀ-ॿ‌‍]+)/;
const isDeva = (s: string) => /[ऀ-ॿ]/.test(s);

export interface TextOpts {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** box width used by center / right alignment */
  w?: number;
}

export class Pen {
  constructor(public doc: Doc) {}

  static register(doc: Doc, f: FontSet) {
    doc.registerFont('L', f.latin);
    doc.registerFont('LB', f.latinBold);
    doc.registerFont('D', f.deva);
    doc.registerFont('DB', f.devaBold);
  }

  private runs(str: string): Array<{ t: string; deva: boolean }> {
    return str
      .split(DEVA_RUN)
      .filter((p) => p !== '')
      .map((t) => ({ t, deva: isDeva(t) }));
  }
  private fontName(deva: boolean, bold: boolean) {
    return deva ? (bold ? 'DB' : 'D') : bold ? 'LB' : 'L';
  }

  measure(str: string, size: number, bold = false): number {
    let w = 0;
    for (const r of this.runs(str)) {
      this.doc.font(this.fontName(r.deva, bold)).fontSize(size);
      w += this.doc.widthOfString(r.t);
    }
    return w;
  }

  /** Greedy word wrap using real measured widths. Splits long words by characters if needed. */
  wrap(str: string, size: number, bold: boolean, maxW: number): string[] {
    const out: string[] = [];
    for (const para of String(str ?? '').split('\n')) {
      const words = para.split(/\s+/).filter(Boolean);
      let line = '';
      for (const word of words) {
        const trial = line ? `${line} ${word}` : word;
        if (this.measure(trial, size, bold) <= maxW) {
          line = trial;
          continue;
        }
        if (line) out.push(line);
        if (this.measure(word, size, bold) <= maxW) {
          line = word;
        } else {
          let chunk = '';
          for (const ch of Array.from(word)) {
            if (this.measure(chunk + ch, size, bold) > maxW && chunk) {
              out.push(chunk);
              chunk = ch;
            } else chunk += ch;
          }
          line = chunk;
        }
      }
      out.push(line);
    }
    return out.length ? out : [''];
  }

  /** Draws one line with its BASELINE at y. Returns drawn width. */
  text(str: string, x: number, baseline: number, o: TextOpts = {}): number {
    const size = o.size ?? 10;
    const bold = !!o.bold;
    const total = this.measure(str, size, bold);
    let cx = x;
    if (o.align === 'center') cx = x + ((o.w ?? 0) - total) / 2;
    else if (o.align === 'right') cx = x + (o.w ?? 0) - total;
    this.doc.fillColor(o.color ?? COLORS.ink);
    for (const r of this.runs(str)) {
      const name = this.fontName(r.deva, bold);
      this.doc.font(name).fontSize(size);
      const asc = ((this.doc._font?.ascender ?? 900) / 1000) * size;
      this.doc.text(r.t, cx, baseline - asc, { lineBreak: false, width: undefined });
      cx += this.doc.widthOfString(r.t);
    }
    return total;
  }

  /** Wrapped paragraph. Returns the height used. */
  para(str: string, x: number, top: number, w: number, o: TextOpts & { lead?: number } = {}): number {
    const size = o.size ?? 10;
    const lead = o.lead ?? size * (isDeva(str) ? 1.62 : 1.4);
    const lines = this.wrap(str, size, !!o.bold, w);
    lines.forEach((ln, i) => this.text(ln, x, top + size * 0.95 + i * lead, { ...o, w }));
    return lines.length * lead;
  }

  paraHeight(str: string, w: number, size: number, bold = false, lead?: number): number {
    const l = lead ?? size * (isDeva(str) ? 1.62 : 1.4);
    return this.wrap(str, size, bold, w).length * l;
  }

  rule(x1: number, y: number, x2: number, color = COLORS.line, width = 0.8) {
    this.doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke().restore();
  }
  rect(x: number, y: number, w: number, h: number, fill?: string, stroke?: string, r = 0, lw = 0.8) {
    const d = this.doc.save();
    if (r) d.roundedRect(x, y, w, h, r);
    else d.rect(x, y, w, h);
    if (fill && stroke) d.lineWidth(lw).fillAndStroke(fill, stroke);
    else if (fill) d.fill(fill);
    else if (stroke) d.lineWidth(lw).stroke(stroke);
    d.restore();
  }
}

/* ------------------------------ page furniture ------------------------------ */
export interface Brand {
  logo: ArrayBuffer | Uint8Array | null;
  name: string; // शुभदर्शन / Shubhdarshan
  tagline: string;
  reportKind: string;
  website: string;
  addressLine: string;
  disclaimer: string;
}

export const HEADER_H = 74;
export const FOOTER_H = 58;
export const bodyTop = () => HEADER_H + 14;
export const bodyBottom = () => PAGE.h - FOOTER_H - 8;

export function drawHeader(pen: Pen, b: Brand) {
  const { doc } = pen;
  pen.rect(0, 0, PAGE.w, 5, COLORS.saffron);
  pen.rect(0, 5, PAGE.w, 1.6, COLORS.maroon);
  if (b.logo) doc.image(b.logo, MARGIN, 16, { fit: [46, 46] });
  const tx = MARGIN + (b.logo ? 56 : 0);
  pen.text(b.name, tx, 38, { size: 21, bold: true, color: COLORS.maroon });
  pen.text(b.tagline, tx, 53, { size: 8.5, color: COLORS.gold, bold: true });
  pen.text(b.reportKind, MARGIN, 36, { size: 11, bold: true, color: COLORS.ink, align: 'right', w: PAGE.w - MARGIN * 2 });
  pen.text(b.website, MARGIN, 51, { size: 8.5, color: COLORS.muted, align: 'right', w: PAGE.w - MARGIN * 2 });
  pen.rule(MARGIN, HEADER_H - 4, PAGE.w - MARGIN, COLORS.gold, 1);
}

export function drawFooter(pen: Pen, b: Brand, pageLabel: string, generated: string) {
  const y = PAGE.h - FOOTER_H;
  const w = PAGE.w - MARGIN * 2;
  pen.rule(MARGIN, y, PAGE.w - MARGIN, COLORS.line, 0.8);
  const dh = pen.paraHeight(b.disclaimer, w, 7, false, 10);
  pen.para(b.disclaimer, MARGIN, y + 5, w, { size: 7, color: COLORS.faint, lead: 10 });
  const by = y + 8 + Math.max(dh, 20) + 8;
  pen.text(`${b.addressLine}`, MARGIN, by, { size: 7, color: COLORS.muted });
  pen.text(`${generated}   |   ${pageLabel}`, MARGIN, by, { size: 7, color: COLORS.muted, align: 'right', w });
}

/* ------------------------------ flow / pagination ------------------------------ */
export class Flow {
  y: number;
  constructor(public pen: Pen, private onNewPage: () => void) {
    this.y = bodyTop();
  }
  ensure(h: number) {
    if (this.y + h > bodyBottom()) {
      this.pen.doc.addPage();
      this.onNewPage();
      this.y = bodyTop();
    }
  }
  gap(h: number) {
    this.y += h;
  }
}

export function sectionTitle(flow: Flow, title: string, sub?: string) {
  const { pen } = flow;
  flow.ensure(110); // keep the heading together with the start of its table
  const x = MARGIN;
  pen.rect(x, flow.y + 1, 3.2, 15, COLORS.saffron);
  pen.text(title, x + 10, flow.y + 13, { size: 13, bold: true, color: COLORS.maroon });
  if (sub) pen.text(sub, x, flow.y + 13, { size: 8.5, color: COLORS.muted, align: 'right', w: PAGE.w - MARGIN * 2 });
  flow.y += 24;
}

export interface Col {
  w: number; // relative weight
  head: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  color?: (cell: string, row: string[]) => string | undefined;
}

export function table(flow: Flow, cols: Col[], rows: string[][], opts: { size?: number; pad?: number } = {}) {
  const { pen } = flow;
  const size = opts.size ?? 9;
  const pad = opts.pad ?? 5;
  const total = PAGE.w - MARGIN * 2;
  const sum = cols.reduce((a, c) => a + c.w, 0);
  const widths = cols.map((c) => (c.w / sum) * total);

  const head = () => {
    const hh = Math.max(...cols.map((c, i) => pen.paraHeight(c.head, widths[i] - pad * 2, size - 0.5, true))) + pad * 1.6;
    flow.ensure(hh + 30);
    pen.rect(MARGIN, flow.y, total, hh, COLORS.maroon);
    let x = MARGIN;
    cols.forEach((c, i) => {
      pen.para(c.head, x + pad, flow.y + pad * 0.8, widths[i] - pad * 2, { size: size - 0.5, bold: true, color: COLORS.white, align: c.align });
      x += widths[i];
    });
    flow.y += hh;
  };
  // keep a table that fits on one page together (title + header + rows) instead of orphaning rows
  const headH = Math.max(...cols.map((c, i) => pen.paraHeight(c.head, widths[i] - pad * 2, size - 0.5, true))) + pad * 1.6;
  const totalH =
    headH + rows.reduce((a, row) => a + Math.max(...row.map((cell, i) => pen.paraHeight(cell, widths[i] - pad * 2, size, !!cols[i].bold))) + pad * 1.5, 0);
  if (totalH < bodyBottom() - bodyTop() - 30 && flow.y + totalH > bodyBottom()) {
    flow.pen.doc.addPage();
    (flow as any).onNewPage();
    flow.y = bodyTop();
  }
  head();
  rows.forEach((row, ri) => {
    const heights = row.map((cell, i) => pen.paraHeight(cell, widths[i] - pad * 2, size, !!cols[i].bold));
    const rh = Math.max(...heights) + pad * 1.5;
    if (flow.y + rh > bodyBottom()) {
      flow.pen.doc.addPage();
      (flow as any).onNewPage();
      flow.y = bodyTop();
      head();
    }
    if (ri % 2 === 0) pen.rect(MARGIN, flow.y, total, rh, COLORS.tint);
    let x = MARGIN;
    row.forEach((cell, i) => {
      pen.para(cell, x + pad, flow.y + pad * 0.75, widths[i] - pad * 2, {
        size,
        bold: cols[i].bold,
        color: cols[i].color?.(cell, row) ?? COLORS.ink,
        align: cols[i].align,
      });
      x += widths[i];
    });
    flow.y += rh;
  });
  pen.rule(MARGIN, flow.y, PAGE.w - MARGIN, COLORS.gold, 0.8);
  flow.y += 4;
}

/** Row of label/value stat cards. */
export function statCards(flow: Flow, cards: Array<{ label: string; value: string; sub?: string }>) {
  const { pen } = flow;
  const gap = 8;
  const n = cards.length;
  const w = (PAGE.w - MARGIN * 2 - gap * (n - 1)) / n;
  const h = 58;
  flow.ensure(h + 8);
  cards.forEach((c, i) => {
    const x = MARGIN + i * (w + gap);
    pen.rect(x, flow.y, w, h, COLORS.tint, COLORS.line, 6);
    pen.rect(x, flow.y + 6, 2.6, h - 12, COLORS.saffron);
    pen.text(c.label, x + 10, flow.y + 14, { size: 7.6, color: COLORS.muted, bold: true });
    const vs = pen.measure(c.value, 13, true) > w - 16 ? 10.5 : 13;
    pen.text(c.value, x + 10, flow.y + 33, { size: vs, bold: true, color: COLORS.maroon });
    if (c.sub) pen.text(c.sub, x + 10, flow.y + 48, { size: 7.6, color: COLORS.muted });
  });
  flow.y += h + 10;
}
