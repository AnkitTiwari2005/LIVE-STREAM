/* Offline checks for recordPayout: concurrency lock, rounding reconciliation, DTO validation. Run: npx ts-node --transpile-only scripts/payout-concurrency.test.ts */
import Module from 'module';
const o = (Module as any)._load;
(Module as any)._load = function (r: string, ...a: any[]) {
  if (r === '@prisma/client') { const e = (...k: string[]) => Object.fromEntries(k.map((x) => [x, x])); return { StreamStatus: e('LIVE', 'ENDED'), UserRole: e('ADMIN'), UserStatus: e('ACTIVE'), PaymentStatus: e('PENDING', 'SUCCESS', 'FAILED'), Prisma: {}, PrismaClient: class {} }; }
  return o.call(this, r, ...a);
};
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const { AdminService } = require('../src/modules/admin/admin.service');
  const { RecordPayoutDto } = require('../src/modules/admin/dto/admin.dto');
  const { validate } = require('class-validator');
  const { plainToInstance } = require('class-transformer');

  // Fake DB whose advisory lock really serialises transactions (like pg_advisory_xact_lock).
  const mk = (earned: number) => {
    const rows: any[] = []; let tail: Promise<void> = Promise.resolve();
    const prisma: any = {
      user: { findUnique: async () => ({ id: 'x', name: 'P' }) },
      $transaction: async (fn: any) => {
        let release!: () => void; const mine = new Promise<void>((r) => (release = r));
        const prev = tail; tail = mine;
        const tx = {
          $queryRaw: async () => { await prev; },     // lock acquired when previous tx finished
          streamerEarning: { aggregate: async () => { await sleep(5); return { _sum: { coins: earned } }; } },
          panditPayout: {
            aggregate: async () => { await sleep(5); return { _sum: { coins: rows.reduce((a, r) => a + r.coins, 0), netPaise: rows.reduce((a, r) => a + r.netPaise, 0) } }; },
            create: async ({ data }: any) => { await sleep(10); if (rows.some((r) => r.reference === data.reference)) throw { code: 'P2002' }; rows.push(data); return data; },
          },
          auditLog: { create: async () => ({}) },
        };
        try { return await fn(tx); } finally { release(); }
      },
    };
    return { prisma, rows, svc: new AdminService(prisma, {} as any, {} as any) };
  };
  const T = '2026-11-26T00:00:00Z';

  let f = mk(150);
  const res = await Promise.allSettled([f.svc.recordPayout('x', 100, T, 'A', 'adm', 'a@x'), f.svc.recordPayout('x', 100, T, 'B', 'adm', 'a@x')]);
  ok(res.filter((r) => r.status === 'fulfilled').length === 1 && f.rows.reduce((a, r) => a + r.coins, 0) === 100, 'two concurrent payouts of 100 vs 150 due: exactly one succeeds');
  const rej: any = res.find((r) => r.status === 'rejected');
  ok(rej && rej.reason.constructor.name === 'BadRequestException', 'the loser gets a 400 with the outstanding amount');

  f = mk(150);
  await Promise.all(Array.from({ length: 5 }, (_, i) => f.svc.recordPayout('x', 30, T, 'R' + i, 'adm', 'a@x')));
  ok(f.rows.reduce((a, r) => a + r.coins, 0) === 150, 'five concurrent payouts of 30 settle exactly 150');
  const over = await f.svc.recordPayout('x', 1, T, 'Z', 'adm', 'a@x').then(() => false, () => true);
  ok(over, 'nothing left to settle after full payment');

  // Rounding: 3000 coins paid as 3000 x 1-coin payouts must total exactly the net earned.
  f = mk(3000);
  for (let i = 0; i < 3000; i++) await f.svc.recordPayout('x', 1, T, 'c' + i, 'adm', 'a@x');
  const sumNet = f.rows.reduce((a, r) => a + r.netPaise, 0);
  ok(sumNet === 170000, `3000 one-coin payouts sum to exactly Rs1700.00 net (got ${sumNet / 100})`);

  const dup = mk(500); await dup.svc.recordPayout('x', 10, T, 'U1', 'adm', 'a@x');
  ok(await dup.svc.recordPayout('x', 10, T, 'U1', 'adm', 'a@x').then(() => false, (e: any) => /already exists/.test(e.message)), 'duplicate reference rejected');

  const v = async (b: any) => (await validate(plainToInstance(RecordPayoutDto, b))).length > 0;
  const base = { streamerId: 'x', coins: 10, periodTo: T, reference: 'r' };
  ok(!(await v(base)), 'valid body accepted');
  ok(await v({ ...base, coins: 1.5 }), 'fractional coins rejected');
  ok(await v({ ...base, coins: 0 }), 'zero coins rejected');
  ok(await v({ ...base, coins: -5 }), 'negative coins rejected');
  ok(await v({ ...base, periodTo: 'garbage' }), 'invalid periodTo rejected');
  ok(await v({ ...base, reference: '   ' }), 'blank reference rejected');
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
