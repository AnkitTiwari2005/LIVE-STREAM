import 'reflect-metadata';
process.env.NODE_ENV = 'test';
delete process.env.RAZORPAY_WEBHOOK_SECRET;
import { PaymentsService } from '../src/modules/payments/payments.service';
import { StreamersService } from '../src/modules/streamers/streamers.service';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };

(async () => {
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  // ---- payment.failed keeps the order PENDING ----
  const updates: any[] = [];
  const prisma1: any = { walletTopupOrder: { updateMany: async (a: any) => { updates.push(a); return { count: 1 }; } } };
  const svc1 = new PaymentsService(prisma1, null as any, null as any, null as any);
  await svc1.handleWebhook({ event: 'payment.failed', payload: { payment: { entity: { order_id: 'o1', error_code: 'BAD_REQUEST_ERROR' } } } });
  ok(updates.length === 1 && updates[0].data.status === undefined && updates[0].where.status === 'PENDING' && !!updates[0].data.failureReason,
     'payment.failed records the reason and never flips the order to FAILED');

  // ---- refund: partial, atomic SQL, idempotent ----
  const txs = new Set<string>(); const raws: any[] = []; const audits: any[] = []; let orderUpdates = 0;
  const tx: any = {
    walletTransaction: {
      findUnique: async ({ where }: any) => (txs.has(where.idempotencyKey) ? { id: 'x' } : null),
      create: async ({ data }: any) => { txs.add(data.idempotencyKey); raws.push(['tx', data]); return data; },
    },
    $queryRawUnsafe: async (sql: string, uid: string, n: number) => { raws.push(['sql', n]); return [{ id: 'w1', before: 100, after: 100 - Math.min(100, n) }]; },
    walletTopupOrder: { update: async () => { orderUpdates++; } },
    auditLog: { create: async ({ data }: any) => { audits.push(data); } },
  };
  const prisma2: any = {
    walletTopupOrder: { findFirst: async () => ({ id: 't1', userId: 'u1', orderId: 'o1', coinsToCredit: 150, amountInr: '100.00', status: 'SUCCESS' }) },
    $transaction: async (fn: any) => fn(tx),
  };
  const svc2 = new PaymentsService(prisma2, null as any, null as any, null as any);
  const ev = (id: string, amount: number) => ({ event: 'refund.processed', payload: { refund: { entity: { id, payment_id: 'p1', amount } } } });
  await svc2.handleWebhook(ev('rfnd_1', 5000)); // 50% of Rs100
  const sql1 = raws.find((r) => r[0] === 'sql');
  ok(sql1 && sql1[1] === 75, 'partial refund (50%) claws back 75 of 150 coins');
  ok(orderUpdates === 0, 'partial refund does not close the order');
  await svc2.handleWebhook(ev('rfnd_1', 5000)); // retry of same webhook
  ok(raws.filter((r) => r[0] === 'sql').length === 1, 'replayed refund id is applied once');
  await svc2.handleWebhook(ev('rfnd_2', 5000)); // second refund for the rest
  ok(raws.filter((r) => r[0] === 'sql').length === 2, 'second refund (different refund id) on the same payment is applied too');
  ok(audits.length === 2 && audits[0].details.coinsUncollected === 0, 'audit log records debited / uncollected coins');

  // ---- earnings totals cover all streams, table limited to 50 ----
  const calls: any = {};
  const prisma3: any = {
    stream: {
      findMany: async (a: any) => { calls.findMany = a; return [{ id: 's1', title: 'T', visibility: 'PUBLIC', status: 'ENDED' }]; },
      count: async () => 120,
    },
    streamerEarning: { groupBy: async (a: any) => { (calls.groups ??= []).push(a); return a.by.length === 1 ? [{ source: 'DAKSHINA', _sum: { coins: 1500 } }, { source: 'WATCH_TIME', _sum: { coins: 300 } }] : [{ streamId: 's1', source: 'DAKSHINA', _sum: { coins: 10 } }]; } },
    dakshinaOffering: { findMany: async () => [], aggregate: async () => ({ _sum: { amount: 0 }, _count: { id: 0 } }) },
    streamViewingSession: { aggregate: async () => ({ _sum: { totalMinutesWatched: 0, totalCoinsDebited: 0 } }) },
  };
  const svc3 = new StreamersService(prisma3);
  const res: any = await svc3.getStreamerEarnings('u1', 'STREAMER');
  ok(res.totalStreams === 120, 'totalStreams counts every stream, not just 50');
  ok(res.totalCoins === 1800, 'coin totals come from all streams (relation filter), not the latest 50');
  ok(!!calls.groups[0].where.stream && calls.groups[0].where.stream.streamerId === 'u1', 'aggregate is scoped to the streamer via relation filter');
  ok(res.perStreamEarnings.length === 1 && calls.findMany.take === 50, 'per-stream table still limited to 50');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
