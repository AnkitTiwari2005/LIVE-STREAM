import Module from 'module';
const o = (Module as any)._load;
(Module as any)._load = function (r: string, ...a: any[]) {
  if (r === '@prisma/client') { const e = (...k: string[]) => Object.fromEntries(k.map((x) => [x, x])); return { StreamStatus: e('LIVE', 'ENDED'), UserRole: e('ADMIN'), UserStatus: e('ACTIVE'), Prisma: {}, PrismaClient: class {} }; }
  return o.call(this, r, ...a);
};
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
(async () => {
  const { AdminService } = require('../src/modules/admin/admin.service');
  const prisma: any = {
    streamerEarning: { groupBy: async () => [
      { streamerId: 'p1', _sum: { coins: 150 }, _count: { _all: 2 }, _max: { createdAt: new Date('2026-11-01') } },
      { streamerId: 'p2', _sum: { coins: 1500 }, _count: { _all: 9 }, _max: { createdAt: null } },
    ] },
    user: { findMany: async () => [{ id: 'p1', name: 'A', email: 'a@x', avatarUrl: null }, { id: 'p2', name: 'B', email: 'b@x', avatarUrl: null }] },
    dakshinaOffering: { findMany: async (q: any) => { (prisma as any).lastQ = q; return []; }, count: async () => 0 },
  };
  const s = new AdminService(prisma, {} as any, {} as any);
  const r = await s.getDakshinaLedger();
  const p2 = r.ledger[0], p1 = r.ledger[1];
  ok(p2.panditId === 'p2' && p2.totalCoins === 1500, 'sorted by coins');
  ok(p1.grossInr === 100 && p1.totalInr === 85 && p1.platformFeeInr === 15, '150 coins = Rs100 gross, Rs85 net, Rs15 fee');
  ok(p2.grossInr === 1000 && p2.totalInr === 850, '1500 coins = Rs1000 gross, Rs850 net');
  ok(r.platformTotalCoins === 1650 && r.platformTotalInr === 935 && r.platformGrossInr === 1100, 'platform totals consistent');
  ok(p2.lastDakshinaAt === null, 'null last date handled');
  const bad = await s.getPoojaBookings('HACK', 1, 10).then(() => false, (e: any) => e.constructor.name === 'BadRequestException');
  ok(bad, 'invalid booking status rejected (400, not 500)');
  await s.getPoojaBookings('ALL', -3, 99999);
  ok(prisma.lastQ.take === 200 && prisma.lastQ.skip === 0, 'page/limit clamped');
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
