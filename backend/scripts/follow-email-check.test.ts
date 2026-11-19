import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StreamersService } from '../src/modules/streamers/streamers.service';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };

const mk = (verified: boolean | null, profile = true) => {
  const writes: string[] = [];
  const prisma: any = {
    streamerProfile: { findUnique: async () => (profile ? { id: 's1' } : null), update: () => { writes.push('count'); return 'u'; } },
    user: { findUnique: async () => (verified === null ? null : { isEmailVerified: verified }) },
    follow: { create: () => { writes.push('follow'); return 'f'; } },
    $transaction: async () => [],
  };
  return { svc: new StreamersService(prisma), writes };
};

(async () => {
  let e: any;
  let m = mk(false);
  try { await m.svc.follow('u1', 's1'); } catch (x) { e = x; }
  ok(e instanceof BadRequestException && /verified/.test(e.message), 'unverified account is refused with 400');
  ok(m.writes.length === 0, 'nothing is written for an unverified account');

  m = mk(null); e = undefined;
  try { await m.svc.follow('ghost', 's1'); } catch (x) { e = x; }
  ok(e instanceof BadRequestException, 'unknown follower is refused');

  m = mk(true);
  const r: any = await m.svc.follow('u1', 's1');
  ok(r.following === true && !r.message, 'verified account follows');

  m = mk(true, false); e = undefined;
  try { await m.svc.follow('u1', 'nope'); } catch (x) { e = x; }
  ok(e instanceof NotFoundException, 'missing streamer is still 404');

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
