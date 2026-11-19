import 'reflect-metadata';
import * as http from 'http';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const calls: any[] = [];
let mode: 'ok' | 'noscore' | 'ambA' | 'ambAparam' | 'ambB' | 'timeReq' = 'ok';
const cand = [{ place_id: 'pl_1', name: 'Aurangabad', state: 'Bihar', country: 'IN' }, { place_id: 'pl_2', name: 'Aurangabad', state: 'Maharashtra', country: 'IN' }];
const server = http.createServer((req, res) => {
  let raw = ''; req.on('data', (c) => (raw += c)); req.on('end', () => {
    const body = raw ? JSON.parse(raw) : null; calls.push({ url: req.url, body });
    const j = (s: number, o: any) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (mode === 'ambA') return j(422, { error: { code: 'place_ambiguous', message: 'm', candidates: cand } });
    if (mode === 'ambAparam') return j(422, { error: { code: 'place_ambiguous', message: 'm', param: 'person_a.place.query', candidates: cand } });
    if (mode === 'ambB') return j(422, { error: { code: 'place_ambiguous', message: 'm', param: 'person_b.place.query', candidates: cand } });
    if (mode === 'noscore') return j(200, { data: { something: 'else' }, meta: {} });
    if (mode === 'timeReq') return j(422, { error: { code: 'time_required', message: 'm' } });
    j(200, { data: { total: 27.5, max: 36, conclusion: 'Good', kootas: [{ name: 'nadi', score: 8, max: 8 }], doshas: { nadi: false, bhakoot: false }, person_a: { rashi: 'leo', evil: 1 }, person_b: {} }, meta: { ayanamsa: 'lahiri' } });
  });
});
(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.NODE_ENV = 'test';
  process.env.ASTROLOGICS_API_KEY = 'al_test_FAKEKEYFORTESTING123456';
  process.env.ASTROLOGICS_BASE_URL = `http://127.0.0.1:${(server.address() as any).port}`;
  process.env.ASTROLOGICS_MAX_RPS = '50';
  const { AstroLogicsClient } = require('../src/modules/kundli/astrologics.client');
  const { KundliService } = require('../src/modules/kundli/kundli.service');
  const mk = () => new KundliService(new AstroLogicsClient());
  const A = { name: 'A', date: '1990-05-14', time: '10:30', placeQuery: 'Aurangabad' };
  const B = { name: 'B', date: '1992-01-02', placeQuery: 'Aurangabad, Maharashtra' };

  let s = mk(); let r: any = await s.match('u1', { personA: A, personB: B });
  ok(r.total === 27.5 && r.percentage === 76 && !('evil' in (r.personA || {})), 'match maps and whitelists the upstream response');
  ok(calls[0].url === '/v1/match/ashtakoot' && calls[0].body.person_b.time === undefined, 'unknown time omitted for person B');
  ok(calls[0].body.person_b.time_accuracy !== undefined, 'person with no time sends time_accuracy "unknown" (else upstream may ask for a time)');
  ok(calls[0].body.person_a.time_accuracy !== undefined, 'person with a time states its accuracy');

  mode = 'ambA'; s = mk(); let e: any;
  try { await s.match('u2', { personA: A, personB: B }); } catch (x) { e = x; }
  ok(e?.getResponse?.().target === 'personA', 'upstream ambiguity on person A (A is validated first) is shown under Partner 1, not Partner 2');

  mode = 'ambAparam'; s = mk(); e = undefined;
  try { await s.match('u3', { personA: A, personB: B }); } catch (x) { e = x; }
  ok(e?.getResponse?.().target === 'personA', 'upstream "param" naming person_a is honoured');

  mode = 'ambB'; s = mk(); e = undefined;
  try { await s.match('u4', { personA: { ...A, placeQuery: undefined, placeId: 'pl_9' }, personB: B }); } catch (x) { e = x; }
  ok(e?.getResponse?.().target === 'personB', 'ambiguity on B after A resolved -> Partner 2');

  mode = 'timeReq'; s = mk(); e = undefined;
  try { await s.match('u5', { personA: A, personB: B }); } catch (x) { e = x; }
  ok(e?.getResponse?.().code === 'time_required', 'time_required surfaces cleanly');

  mode = 'noscore'; s = mk(); e = undefined;
  try { await s.match('u6', { personA: A, personB: B }); } catch (x) { e = x; }
  ok(e?.getResponse?.().code === 'unavailable', 'an upstream answer without a score is an error, not "0/36"');

  // Real upstream behaviour: ambiguity comes back with an unscoped param ("birth.place.query")
  mode = 'ambA'; s = mk(); e = undefined;
  try { await s.match('u7', { personA: { ...A, placeQuery: 'Mumbai' }, personB: { ...B, placeQuery: 'Aurangabad' } }); } catch (x) { e = x; }
  ok(e?.getResponse?.().target === 'personB', 'A unique (Mumbai), B ambiguous (Aurangabad) -> list goes to Partner 2');
  s = mk(); e = undefined;
  try { await s.match('u8', { personA: { ...A, placeQuery: 'Aurangabad' }, personB: { ...B, placeQuery: 'Mumbai' } }); } catch (x) { e = x; }
  ok(e?.getResponse?.().target === 'personA' && /Aurangabad/.test(e.getResponse().message), 'A ambiguous, B unique -> Partner 1, and the typed place is named in the message');
  s = mk(); e = undefined;
  try { await s.match('u9', { personA: { ...A, placeQuery: 'Aurangabad' }, personB: { ...B, placeQuery: 'Aurangabad, Maharashtra' } }); } catch (x) { e = x; }
  ok(e?.getResponse?.().target === 'personA', 'same city typed twice: the less specific text is the ambiguous one');

  const dto: any = plainToInstance(require('../src/modules/kundli/dto/kundli.dto').KundliMatchDto, { personA: A, personB: { ...B, date: 'x' } });
  ok((await validate(dto)).length > 0, 'DTO rejects a bad date on nested person');
  console.log(`\n${pass} passed, ${fail} failed`); server.close(); process.exit(fail ? 1 : 0);
})();
