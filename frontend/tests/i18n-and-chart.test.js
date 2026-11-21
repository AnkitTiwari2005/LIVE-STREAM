// Run:  node frontend/tests/i18n-and-chart.test.js   (needs `typescript`, already a devDependency)
const ts = require('typescript'), fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert');
const src = path.join(__dirname, '..', 'src', 'app', 'kundli');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kt-'));
for (const f of ['kundli-i18n.ts', 'kundli-chart.ts']) {
  fs.writeFileSync(path.join(tmp, f.replace('.ts', '.js')),
    ts.transpileModule(fs.readFileSync(path.join(src, f), 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2020' } }).outputText);
}
const i18n = require(path.join(tmp, 'kundli-i18n.js'));
const chart = require(path.join(tmp, 'kundli-chart.js'));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// 1. English / Hindi parity, placeholders identical
const { en, hi } = i18n.UI_TABLES;
ok(JSON.stringify(Object.keys(en)) === JSON.stringify(Object.keys(hi)), 'same keys');
for (const k of Object.keys(en)) {
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  ok(ph(en[k]) === ph(hi[k]), 'placeholders ' + k);
  ok(hi[k].trim().length > 0, 'hi non-empty ' + k);
}
// 2. every code the engine can return has a Hindi form
for (const s of i18n.SIGN_ORDER) ok(/[ऀ-ॿ]/.test(i18n.signLabel(s, 'hi')), 'sign ' + s);
for (const p of ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu']) ok(/[ऀ-ॿ]/.test(i18n.planetName(p, 'hi')), 'planet ' + p);
for (const k of ['varna','vashya','tara_dina','yoni','graha_maitri','gana','bhakoot','nadi']) {
  ok(/[ऀ-ॿ]/.test(i18n.kootaLabel(k, 'X', 'hi')), 'koota ' + k);
  ok(/[ऀ-ॿ]/.test(i18n.kootaExplanation(k, 'hi')), 'explain ' + k);
}
const naks = ['ashwini','bharani','krittika','rohini','mrigashira','ardra','punarvasu','pushya','ashlesha','magha','purva_phalguni','uttara_phalguni','hasta','chitra','swati','vishakha','anuradha','jyeshtha','mula','purva_ashadha','uttara_ashadha','shravana','dhanishta','shatabhisha','purva_bhadrapada','uttara_bhadrapada','revati'];
for (const k of naks) ok(/[ऀ-ॿ]/.test(i18n.nakshatraName(k, 'hi')), 'nakshatra ' + k);
ok(i18n.nakshatraName('uttara_phalguni', 'en') === 'Uttara Phalguni', 'english nakshatra unchanged');
ok(i18n.signLabel('leo', 'en') === 'Leo (Simha)', 'english sign unchanged');
// 3. match bands
ok(i18n.matchBand(28) === 'excellent' && i18n.matchBand(21) === 'good' && i18n.matchBand(18) === 'acceptable' && i18n.matchBand(17.5) === 'low', 'bands');
ok(i18n.conclusionText(30, 'Upstream text', 'en') === 'Upstream text', 'english keeps engine text');
ok(/[ऀ-ॿ]/.test(i18n.conclusionText(30, 'Upstream text', 'hi')), 'hindi conclusion');
ok(i18n.formatDateL('2026-06-21T00:00:00Z', 'hi') === '21 जून 2026' && i18n.formatDateL('2026-06-21T00:00:00Z', 'en') === '21 Jun 2026', 'dates');
// 4. navamsa: hand-checked values (movable starts at itself, fixed at 9th, dual at 5th)
const S = (n) => i18n.SIGN_ORDER.indexOf(n);
ok(chart.navamsaSign(S('aries'), 0) === S('aries'), 'aries 0');
ok(chart.navamsaSign(S('aries'), 29.9) === S('sagittarius'), 'aries last pada');
ok(chart.navamsaSign(S('leo'), 10) === S('cancer'), 'leo 10');
ok(chart.navamsaSign(S('gemini'), 0) === S('libra'), 'gemini 0');
ok(chart.navamsaSign(S('pisces'), 29.99) === S('pisces'), 'pisces end');
// 5. chart model
const m = chart.buildChart({ lagnaSign: 'leo', lagnaDegree: 11, moonSign: 'cancer', planets: [{ id: 'sun', sign: 'leo', degree: 5 }, { id: 'saturn', sign: 'pisces', degree: 9, retrograde: true }] }, 'D1', 'en');
ok(m.houses[0].sign === S('leo') && m.houses[0].items.includes('Asc') && m.houses[0].items.includes('Su'), 'asc house');
ok(m.houses[7].items.includes('Sa(R)'), 'saturn in 8th from leo');
const mh = chart.buildChart({ lagnaSign: 'leo', planets: [{ id: 'sun', sign: 'leo', degree: 5 }] }, 'D1', 'hi');
ok(mh.houses[0].items.includes('सू') && mh.houses[0].items.includes('ल'), 'hindi abbreviations');
const nt = chart.buildChart({ lagnaSign: null, moonSign: 'cancer', planets: [{ id: 'moon', sign: 'cancer', degree: 5 }] }, 'D1', 'en');
ok(nt.fromMoon && nt.houses[0].sign === S('cancer') && !nt.houses[0].items.includes('Asc'), 'moon chart when no time');
ok(chart.buildChart({ planets: [] }, 'D1', 'en') === null, 'no data -> null');
// 6. geometry: 12 cells each
ok(chart.northCells().length === 12 && chart.southCells().length === 12, 'cells');
ok(new Set(chart.southCells().map((c) => c.sign)).size === 12, 'south signs unique');
console.log(`OK ${n} checks`);
