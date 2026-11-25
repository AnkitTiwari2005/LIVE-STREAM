/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Pen, Flow, COLORS, PAGE, MARGIN, FontSet, Brand, Doc,
  drawHeader, drawFooter, sectionTitle, table, statCards, bodyBottom,
} from './pen';
import { texts, Lang, signLabel, planetName, nakshatraName, avakhadaKeyLabel, traitValue, formatDateL, todayText, prettySlug,
  kootaLabel, kootaExplanation, kootaNote, conclusionText, bandSummary, matchBand } from '../kundli-i18n';
import { buildChart, northCells, southCells, wrapItems, cellSignLabel, type ChartModel, type Varga } from '../kundli-chart';
import { formatDegree } from '../kundli-utils';

export interface PdfAssets {
  fonts: FontSet;
  logo: ArrayBuffer | Uint8Array | null;
}
export type PdfCtor = new (opts: any) => Doc;

function brand(lang: Lang, kind: string, assets: PdfAssets): Brand {
  const t = texts(lang);
  return {
    logo: assets.logo,
    name: lang === 'hi' ? 'परम दर्शन' : 'Param Darshan',
    tagline: t.brandTagline,
    reportKind: kind,
    website: 'paramdarshan.com',
    addressLine: lang === 'hi'
      ? 'परम दर्शन • रोहिणी सेक्टर 15, दिल्ली 110089 • paramdarshan.com@gmail.com'
      : 'Param Darshan • Rohini Sector 15, Delhi 110089 • paramdarshan.com@gmail.com',
    disclaimer: `${t.disclaimer} ${t.pdfFooterNote}`,
  };
}

function open(PDF: PdfCtor, title: string, assets: PdfAssets, lang: Lang, kindLabel: string) {
  const doc = new PDF({
    size: 'A4', margin: 0, bufferPages: true, autoFirstPage: true,
    info: { Title: title, Author: 'Param Darshan', Subject: kindLabel, Creator: 'Param Darshan', Producer: 'Param Darshan' },
  });
  const pen = new Pen(doc);
  Pen.register(doc, assets.fonts);
  const b = brand(lang, kindLabel, assets);
  const flow = new Flow(pen, () => drawHeader(pen, b));
  drawHeader(pen, b);
  return { doc, pen, b, flow };
}

function finish(doc: Doc, pen: Pen, b: Brand, lang: Lang): Promise<Uint8Array> {
  const t = texts(lang);
  const range = doc.bufferedPageRange();
  const generated = t.f('generatedOn', { date: todayText(lang) });
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(pen, b, t.f('page', { n: i + 1, total: range.count }), generated);
  }
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    doc.on('data', (c: Uint8Array) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => {
      const len = chunks.reduce((a, c) => a + c.length, 0);
      const out = new Uint8Array(len);
      let o = 0;
      chunks.forEach((c) => { out.set(c, o); o += c.length; });
      resolve(out);
    });
    doc.end();
  });
}

/* ------------------------------ chart ------------------------------ */
export function drawChart(pen: Pen, model: ChartModel, style: 'north' | 'south', lang: Lang, x: number, y: number, size: number, title: string, caption: string) {
  const { doc } = pen;
  const k = size / 400;
  const P = (px: number, py: number): [number, number] => [x + px * k, y + py * k];
  pen.rect(x, y, size, size, '#FFFDF7');
  doc.save().lineWidth(1.1).strokeColor(COLORS.maroon);
  doc.rect(x, y, size, size).stroke();
  doc.lineWidth(0.8);
  const line = (a: [number, number], b: [number, number]) => doc.moveTo(...P(...a)).lineTo(...P(...b)).stroke();
  if (style === 'north') {
    line([0, 0], [400, 400]); line([400, 0], [0, 400]);
    doc.moveTo(...P(200, 0)).lineTo(...P(400, 200)).lineTo(...P(200, 400)).lineTo(...P(0, 200)).closePath().stroke();
  } else {
    [100, 300].forEach((v) => { line([v, 0], [v, 400]); line([0, v], [400, v]); });
    line([200, 0], [200, 100]); line([200, 300], [200, 400]); line([0, 200], [100, 200]); line([300, 200], [400, 200]);
  }
  doc.restore();
  if (style === 'south') pen.text(title, P(100, 0)[0], P(0, 193)[1], { size: 9.5, bold: true, color: COLORS.maroon, align: 'center', w: 200 * k });
  const cells = style === 'north' ? northCells() : southCells();
  const signToHouse = new Map<number, number>();
  model.houses.forEach((h, i) => signToHouse.set(h.sign, i));
  for (const c of cells) {
    const hIdx = style === 'north' ? c.house - 1 : signToHouse.get(c.sign) ?? 0;
    const h = model.houses[hIdx];
    const sign = style === 'north' ? h.sign : c.sign;
    const [nx, ny] = P(c.nx, c.ny);
    pen.text(cellSignLabel(style, sign, lang), nx - 20, ny + 3, { size: style === 'north' ? 8 : 6.8, color: COLORS.gold, align: 'center', w: 40 });
    if (style === 'south' && hIdx === 0 && !model.fromMoon) {
      const [ax, ay] = P(c.poly[0][0], c.poly[0][1]);
      doc.save().lineWidth(1.2).strokeColor(COLORS.saffron).moveTo(ax, ay + 14).lineTo(ax + 14, ay).stroke().restore();
    }
    const lines = wrapItems(h.items, c.perLine);
    const [cx, cy] = P(c.cx, c.cy);
    lines.forEach((ln, i) => pen.text(ln, cx - 45, cy + (i - (lines.length - 1) / 2) * 10.5 + 3, { size: 8.4, bold: true, color: COLORS.ink, align: 'center', w: 90 }));
  }
  pen.text(caption, x, y + size + 12, { size: 8.5, bold: true, color: COLORS.maroon, align: 'center', w: size });
}

/* ------------------------------ Janam Kundli ------------------------------ */
export interface KundliPdfData {
  result: any;
  submitted: { date: string; time?: string };
  name: string;
  style: 'north' | 'south';
}

export async function buildKundliPdf(PDF: PdfCtor, assets: PdfAssets, data: KundliPdfData, lang: Lang): Promise<Uint8Array> {
  const t = texts(lang);
  const { result, submitted } = data;
  const title = data.name ? t.f('kundliOf', { name: data.name }) : t.yourKundli;
  const { doc, pen, b, flow } = open(PDF, `${title} - Param Darshan`, assets, lang, `${t.kundliTitle} • ${t.kundliSubtitle}`);
  const W = PAGE.w - MARGIN * 2;

  // title block
  pen.rect(MARGIN, flow.y, W, 74, COLORS.tint2, COLORS.line, 8);
  pen.text(t.kundliTitle, MARGIN + 16, flow.y + 24, { size: 9.5, bold: true, color: COLORS.saffron });
  pen.text(title, MARGIN + 16, flow.y + 47, { size: 20, bold: true, color: COLORS.maroon });
  const tz = result.meta?.timezone ? `${result.meta.timezone} (UTC${result.meta.utcOffset ?? ''})` : '';
  const born = t.f('bornLine', {
    date: formatDateL(`${submitted.date}T00:00:00Z`, lang),
    time: submitted.time ? t.f('bornAt', { time: submitted.time }) : t.bornNoTime,
  });
  pen.text([born, tz].filter(Boolean).join('  •  '), MARGIN + 16, flow.y + 64, { size: 8.8, color: COLORS.muted });
  flow.y += 88;

  const maha = result.dasha?.mahadasha;
  statCards(flow, [
    { label: t.lagna, value: result.lagna ? signLabel(result.lagna.sign, lang) : t.needsTime, sub: result.lagna ? `${formatDegree(result.lagna.degree)}` : undefined },
    { label: t.moonSign, value: result.moon ? signLabel(result.moon.sign, lang) : '-' },
    { label: t.birthNakshatra, value: result.moon ? nakshatraName(result.moon.nakshatra, lang) : '-', sub: result.moon?.pada ? t.f('padaCap', { n: result.moon.pada }) : undefined },
    { label: t.runningMaha, value: maha?.planet ? planetName(maha.planet, lang) : '-', sub: maha ? `${formatDateL(maha.start, lang)} ${t.to} ${formatDateL(maha.end, lang)}` : undefined },
  ]);

  // charts D1 + D9 side by side
  sectionTitle(flow, t.chartDrawing, data.style === 'north' ? t.northIndian : t.southIndian);
  const input = {
    lagnaSign: result.lagna?.sign, lagnaDegree: result.lagna?.degree, moonSign: result.moon?.sign,
    planets: result.planets, d9LagnaSign: result.divisionalLagnas?.D9,
  };
  const size = Math.min((W - 24) / 2, 206);
  flow.ensure(size + 30);
  (['D1', 'D9'] as Varga[]).forEach((v, i) => {
    const model = buildChart(input, v, lang);
    const cx = MARGIN + i * ((W - size) ) ;
    if (model) drawChart(pen, model, data.style, lang, cx, flow.y, size, v === 'D1' ? (model.fromMoon ? t.chartMoonTitle : t.chartTitleD1) : t.chartTitleD9, v === 'D1' ? t.lagnaD1 : t.navamsaD9);
  });
  flow.y += size + 22;
  if (!result.lagna) { pen.para(t.chartMoonNote, MARGIN, flow.y, W, { size: 8, color: COLORS.muted }); flow.y += 18; }

  // planets
  flow.gap(6);
  flow.ensure(24 + 20 + 9 * 20);
  sectionTitle(flow, t.planetaryPositions);
  table(flow,
    [{ w: 2.2, head: t.planet, bold: true }, { w: 2.6, head: t.sign }, { w: 1.6, head: t.degree }, { w: 3, head: t.nakshatra }, { w: 1, head: t.house, align: 'center' }],
    (result.planets as any[]).map((p) => [
      planetName(p.id, lang, p.label) + (p.retrograde ? ` (${t.retroMark})` : ''),
      signLabel(p.sign, lang), formatDegree(p.degree),
      `${nakshatraName(p.nakshatra, lang)} (${p.pada ?? '-'})`, String(p.house ?? '-'),
    ]), { size: 8.8, pad: 3.8 });
  pen.text(t.retroNote, MARGIN, flow.y + 9, { size: 7.8, color: COLORS.muted });
  flow.y += 18;

  // avakhada
  if (result.avakhada && Object.keys(result.avakhada).length) {
    flow.gap(8);
    sectionTitle(flow, t.avakhadaChakra);
    const entries = Object.entries(result.avakhada as Record<string, string>);
    table(flow, [{ w: 1, head: lang === 'hi' ? 'विवरण' : 'Attribute', bold: true }, { w: 1, head: lang === 'hi' ? 'मान' : 'Value' }],
      entries.map(([k, v]) => [avakhadaKeyLabel(k, lang), traitValue(k, v, lang)]));
  }

  // dasha
  if (result.dasha) {
    flow.gap(8);
    sectionTitle(flow, t.dashaToday);
    const lv: Array<[string, any]> = [[t.mahadasha, result.dasha.mahadasha], [t.antardasha, result.dasha.antardasha], [t.pratyantardasha, result.dasha.pratyantardasha]];
    table(flow, [{ w: 2, head: lang === 'hi' ? 'स्तर' : 'Level', bold: true }, { w: 2, head: t.planet }, { w: 4, head: lang === 'hi' ? 'अवधि' : 'Period' }],
      lv.filter(([, l]) => l?.planet).map(([n, l]) => [n, planetName(l.planet, lang), `${formatDateL(l.start, lang)} ${t.to} ${formatDateL(l.end, lang)}`]));
  }

  // divisional
  const dl = Object.entries((result.divisionalLagnas ?? {}) as Record<string, string>);
  if (dl.length) {
    flow.gap(8);
    sectionTitle(flow, t.divisional);
    table(flow, [{ w: 1, head: lang === 'hi' ? 'वर्ग' : 'Varga', bold: true }, { w: 3, head: t.sign }], dl.map(([k, v]) => [k, signLabel(v, lang)]));
  }

  // warnings + notes
  const notes: string[] = [];
  if (!result.lagna) notes.push(t.warnNoTime);
  if (result.unavailable?.includes('dasha')) notes.push(t.warnDasha);
  if (result.unavailable?.includes('avakhada')) notes.push(t.warnAvakhada);
  (result.warnings ?? []).forEach((w: string) => notes.push(w));
  const ay = result.meta?.ayanamsa;
  notes.push(t.f('methodNote', { ayanamsa: lang === 'hi' && (!ay || /lahiri/i.test(ay)) ? t.lahiri : ay ? prettySlug(ay) : t.lahiri }));
  flow.gap(10);
  const nh = notes.reduce((a, n) => a + pen.paraHeight(n, W - 24, 8.4) + 3, 0) + 14;
  flow.ensure(nh);
  pen.rect(MARGIN, flow.y, W, nh, COLORS.tint, COLORS.line, 6);
  let ny = flow.y + 8;
  notes.forEach((n) => { const h = pen.para(n, MARGIN + 12, ny, W - 24, { size: 8.4, color: COLORS.muted }); ny += h + 3; });
  flow.y += nh + 6;

  return finish(doc, pen, b, lang);
}

/* ------------------------------ Matching ------------------------------ */
export interface MatchPdfData {
  result: any;
  nameA: string;
  nameB: string;
}

export async function buildMatchPdf(PDF: PdfCtor, assets: PdfAssets, data: MatchPdfData, lang: Lang): Promise<Uint8Array> {
  const t = texts(lang);
  const { result: r } = data;
  const { doc, pen, b, flow } = open(PDF, `${data.nameA} & ${data.nameB} - ${t.matchTitle} - Param Darshan`, assets, lang, `${t.matchTitle} • ${t.matchSubtitle}`);
  const W = PAGE.w - MARGIN * 2;
  const band = matchBand(r.total);
  const bandColor = band === 'excellent' ? COLORS.green : band === 'low' ? COLORS.red : COLORS.amber;

  // hero
  const hh = 124;
  pen.rect(MARGIN, flow.y, W, hh, COLORS.tint2, COLORS.line, 10);
  pen.text(t.matchSubtitle, MARGIN + 18, flow.y + 26, { size: 9.5, bold: true, color: COLORS.saffron });
  const names = `${data.nameA} & ${data.nameB}`;
  const nsz = pen.measure(names, 19, true) > W - 190 ? 14 : 19;
  pen.para(names, MARGIN + 18, flow.y + 34, W - 190, { size: nsz, bold: true, color: COLORS.maroon });
  const cb = conclusionText(r.total, r.conclusion, lang);
  const cbw = pen.measure(cb, 10.5, true) + 24;
  pen.rect(MARGIN + 18, flow.y + 68, cbw, 22, COLORS.white, bandColor, 11, 1.2);
  pen.text(cb, MARGIN + 30, flow.y + 83, { size: 10.5, bold: true, color: bandColor });
  pen.para(bandSummary(r.total, lang), MARGIN + 18, flow.y + 94, W - 190, { size: 8, color: COLORS.muted, lead: 11 });
  // score circle
  const ccx = MARGIN + W - 70, ccy = flow.y + hh / 2;
  doc.save().circle(ccx, ccy, 48).lineWidth(3).fillAndStroke(COLORS.white, COLORS.gold).restore();
  pen.text(String(r.total), ccx - 40, ccy + 8, { size: 30, bold: true, color: COLORS.maroon, align: 'center', w: 80 });
  pen.text(t.outOf36, ccx - 40, ccy + 22, { size: 8, color: COLORS.muted, align: 'center', w: 80 });
  pen.text(t.f('percentScore', { p: r.percentage }), ccx - 40, ccy + 34, { size: 7.8, bold: true, color: COLORS.gold, align: 'center', w: 80 });
  flow.y += hh + 8;

  // doshas
  const dw = (W - 10) / 2;
  const dosha = (x: number, bad: boolean, yes: string, no: string, yn: string, nn: string) => {
    const col = bad ? COLORS.red : COLORS.green;
    pen.rect(x, flow.y, dw, 50, COLORS.white, col, 6, 1);
    pen.rect(x, flow.y, 4, 50, col);
    pen.para(bad ? yes : no, x + 14, flow.y + 7, dw - 22, { size: 9.4, bold: true, color: col });
    pen.para(bad ? yn : nn, x + 14, flow.y + 24, dw - 22, { size: 8, color: COLORS.muted, lead: 11 });
  };
  flow.ensure(58);
  dosha(MARGIN, !!r.doshas?.nadi, t.nadiYes, t.nadiNo, t.nadiYesNote, t.nadiNoNote);
  dosha(MARGIN + dw + 10, !!r.doshas?.bhakoot, t.bhakootYes, t.bhakootNo, t.bhakootYesNote, t.bhakootNoNote);
  flow.y += 64;

  // traits
  sectionTitle(flow, t.traits);
  const keys: Array<[string, string]> = [['rashi', t.moonRashi], ['nakshatra', t.birthNakshatra], ['gana', t.gana], ['nadi', t.nadi], ['yoni', t.yoni]];
  table(flow,
    [{ w: 2.2, head: lang === 'hi' ? 'गुण' : 'Trait', bold: true }, { w: 3, head: `${data.nameA} ${t.partnerTag1}` }, { w: 3, head: `${data.nameB} ${t.partnerTag2}` }],
    keys.map(([k, l]) => [l, traitValue(k, r.personA?.[k], lang), traitValue(k, r.personB?.[k], lang)]), { size: 8.6, pad: 3.8 });

  // kootas
  flow.gap(4);
  sectionTitle(flow, t.breakdown, t.maxLabel);
  const rows = (r.kootas as any[]).map((k) => [kootaLabel(k.name, k.label, lang), kootaExplanation(k.name, lang), String(k.score), String(k.max), kootaNote(k.score, k.max, k.note, lang)]);
  rows.push([t.total, '', String(r.total), '36', r.total >= 18 ? t.alignOk : t.alignLow]);
  table(flow,
    [{ w: 2, head: t.koota, bold: true }, { w: 4.2, head: t.significance }, { w: 1, head: t.score, align: 'center', bold: true }, { w: 1, head: t.max, align: 'center' }, { w: 3, head: t.notes }],
    rows, { size: 8.2, pad: 3 });

  // closing
  flow.gap(4);
  const body = `${t.matchCtaTitle}\n${t.matchCtaText}`;
  const bh = pen.paraHeight(t.matchCtaTitle, W - 28, 10, true) + pen.paraHeight(t.matchCtaText, W - 28, 8.6) + 22;
  flow.ensure(bh + 6);
  pen.rect(MARGIN, flow.y, W, bh, COLORS.tint2, COLORS.line, 8);
  const h1 = pen.para(t.matchCtaTitle, MARGIN + 14, flow.y + 9, W - 28, { size: 10, bold: true, color: COLORS.maroon });
  pen.para(t.matchCtaText, MARGIN + 14, flow.y + 12 + h1, W - 28, { size: 8.6, color: COLORS.muted });
  void body; void bodyBottom;
  return finish(doc, pen, b, lang);
}
