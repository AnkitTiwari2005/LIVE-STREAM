/**
 * Local chart model + geometry. Pure functions, no React and no DOM, so the very same drawing
 * data feeds the on-screen SVG and the PDF. Everything is drawn in a 400 x 400 box.
 */
import { SIGN_ORDER, signIndex, planetAbbr, signShort, type Lang } from './kundli-i18n';

export interface ChartPlanetIn {
  id?: string;
  sign?: string;
  degree?: number;
  retrograde?: boolean;
}
export interface ChartInput {
  lagnaSign?: string | null;
  lagnaDegree?: number | null;
  moonSign?: string | null;
  planets: ChartPlanetIn[];
  /** upstream D9 ascendant sign, used when present so the chart agrees with the engine. */
  d9LagnaSign?: string | null;
}
export type Varga = 'D1' | 'D9';

export interface ChartHouse {
  house: number; // 1..12
  sign: number; // 0..11 (Aries = 0)
  items: string[]; // planet abbreviations (and the ascendant marker)
}
export interface ChartModel {
  houses: ChartHouse[]; // index 0 => house 1
  lagnaSign: number;
  /** true when the birth time was unknown and houses are counted from the Moon. */
  fromMoon: boolean;
  varga: Varga;
}

/** Sign of a planet in the navamsa (D9): 9 equal parts of 3°20' each. */
export function navamsaSign(signIdx: number, degreeInSign: number): number {
  const part = Math.min(8, Math.max(0, Math.floor(degreeInSign / (30 / 9))));
  const mod = signIdx % 3; // 0 movable, 1 fixed, 2 dual
  const start = mod === 0 ? signIdx : mod === 1 ? (signIdx + 8) % 12 : (signIdx + 4) % 12;
  return (start + part) % 12;
}

export function buildChart(input: ChartInput, varga: Varga, lang: Lang): ChartModel | null {
  const lagIdxD1 = signIndex(input.lagnaSign);
  const moonIdx = signIndex(input.moonSign);
  const fromMoon = lagIdxD1 < 0;
  const baseLagna = fromMoon ? moonIdx : lagIdxD1;
  if (baseLagna < 0) return null;

  const placed = input.planets
    .map((p) => {
      const si = signIndex(p.sign);
      if (si < 0) return null;
      const deg = typeof p.degree === 'number' && Number.isFinite(p.degree) ? p.degree : 0;
      return { id: p.id, sign: varga === 'D9' ? navamsaSign(si, deg) : si, retro: !!p.retrograde };
    })
    .filter(Boolean) as Array<{ id?: string; sign: number; retro: boolean }>;

  let lagna = baseLagna;
  if (varga === 'D9') {
    const up = signIndex(input.d9LagnaSign);
    if (!fromMoon) {
      lagna =
        up >= 0
          ? up
          : typeof input.lagnaDegree === 'number'
            ? navamsaSign(lagIdxD1, input.lagnaDegree)
            : lagIdxD1;
    } else {
      // no birth time: the Moon's own navamsa sign is the reference
      const moon = input.planets.find((p) => (p.id || '').toLowerCase() === 'moon');
      lagna = moon && signIndex(moon.sign) >= 0 ? navamsaSign(signIndex(moon.sign), moon.degree ?? 0) : baseLagna;
    }
  }

  const houses: ChartHouse[] = Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: (lagna + i) % 12, items: [] }));
  if (!fromMoon) houses[0].items.push(lang === 'hi' ? 'ल' : 'Asc');
  for (const p of placed) {
    const h = houses[(p.sign - lagna + 12) % 12];
    h.items.push(planetAbbr(p.id, lang) + (p.retro ? (lang === 'hi' ? '(व)' : '(R)') : ''));
  }
  return { houses, lagnaSign: lagna, fromMoon, varga };
}

/* ----------------------------- geometry ----------------------------- */
export type Pt = [number, number];
export interface Cell {
  house: number; // 1..12 for north; 0 for south (sign-fixed)
  sign: number; // sign index for south, filled by caller for north
  poly: Pt[];
  /** anchor for the planet text */
  cx: number;
  cy: number;
  /** anchor for the small sign number */
  nx: number;
  ny: number;
  /** how many planet tokens fit on a text line */
  perLine: number;
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const centroid = (poly: Pt[]): Pt => {
  let x = 0;
  let y = 0;
  poly.forEach((p) => {
    x += p[0];
    y += p[1];
  });
  return [x / poly.length, y / poly.length];
};

const A: Pt = [0, 0], B: Pt = [400, 0], C: Pt = [400, 400], D: Pt = [0, 400];
const T: Pt = [200, 0], R: Pt = [400, 200], M: Pt = [200, 400], L: Pt = [0, 200], O: Pt = [200, 200];
const q1: Pt = [100, 100], q2: Pt = [300, 100], q3: Pt = [300, 300], q4: Pt = [100, 300];

/** North Indian: house 1 on top, then counter-clockwise. */
const NORTH_POLYS: Pt[][] = [
  [T, q1, O, q2], //  1
  [A, T, q1], //  2
  [A, q1, L], //  3
  [L, q1, O, q4], //  4
  [L, q4, D], //  5
  [D, q4, M], //  6
  [M, q4, O, q3], //  7
  [M, q3, C], //  8
  [C, q3, R], //  9
  [R, q3, O, q2], // 10
  [R, q2, B], // 11
  [B, q2, T], // 12
];
export function northCells(): Cell[] {
  return NORTH_POLYS.map((poly, i) => {
    const c = centroid(poly);
    if (poly.length === 4) {
      const n = lerp(c, O, 0.55);
      return { house: i + 1, sign: 0, poly, cx: c[0], cy: c[1], nx: n[0], ny: n[1], perLine: 3 };
    }
    // triangle: planets sit towards the inner corner, the sign number right at it
    const inner = poly.reduce((best, p) => (Math.hypot(p[0] - 200, p[1] - 200) < Math.hypot(best[0] - 200, best[1] - 200) ? p : best), poly[0]);
    const side = [2, 4, 8, 10].includes(i); // houses 3, 5, 9, 11 are tall and narrow
    const others = poly.filter((q) => q !== inner);
    const baseMid: Pt = [(others[0][0] + others[1][0]) / 2, (others[0][1] + others[1][1]) / 2];
    const p = side ? lerp(c, baseMid, 0.3) : lerp(c, inner, 0.3);
    const n = lerp(c, inner, 0.6);
    return { house: i + 1, sign: 0, poly, cx: p[0], cy: p[1], nx: n[0], ny: n[1], perLine: side ? 1 : 2 };
  });
}

/** South Indian: signs are fixed (Pisces top-left, clockwise). */
const SOUTH_SIGN_AT: Array<Array<number | null>> = [
  [11, 0, 1, 2],
  [10, null, null, 3],
  [9, null, null, 4],
  [8, 7, 6, 5],
];
export function southCells(): Cell[] {
  const out: Cell[] = [];
  SOUTH_SIGN_AT.forEach((row, r) =>
    row.forEach((sign, c) => {
      if (sign === null) return;
      const x = c * 100, y = r * 100;
      out.push({
        house: 0,
        sign,
        poly: [[x, y], [x + 100, y], [x + 100, y + 100], [x, y + 100]],
        cx: x + 50,
        cy: y + 54,
        nx: x + 12,
        ny: y + 14,
        perLine: 2,
      });
    }),
  );
  return out;
}

/** Wraps planet tokens into lines for a cell. */
export function wrapItems(items: string[], perLine: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < items.length; i += perLine) lines.push(items.slice(i, i + perLine).join(' '));
  return lines;
}

/** Short sign label for a cell: number in North (1..12 = sign number), name in South. */
export function cellSignLabel(style: 'north' | 'south', signIdx: number, lang: Lang): string {
  return style === 'north' ? String(signIdx + 1) : signShort(signIdx, lang);
}
export { SIGN_ORDER };
