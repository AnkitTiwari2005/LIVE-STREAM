import 'reflect-metadata';
import { spawn, ChildProcess } from 'child_process';
import { TokenBlacklistService } from '../src/common/token-blacklist.service';
import { TokenAwareThrottlerGuard } from '../src/common/guards/token-aware-throttler.guard';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const startRedis = (): ChildProcess | null => {
  try {
    const cp = spawn('redis-server', ['--port', '6391', '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
    cp.on('error', () => {});
    return cp;
  } catch {
    return null;
  }
};

(async () => {
  // N10 tracker: per-token on meter-tick, per-IP elsewhere
  const g: any = Object.create(TokenAwareThrottlerGuard.prototype);
  const t1 = await g.getTracker({ originalUrl: '/api/wallet/meter-tick', headers: { authorization: 'Bearer AAA' }, ip: '1.1.1.1' });
  const t2 = await g.getTracker({ originalUrl: '/api/wallet/meter-tick', headers: { authorization: 'Bearer BBB' }, ip: '1.1.1.1' });
  const t3 = await g.getTracker({ originalUrl: '/api/wallet/meter-tick', headers: {}, cookies: { access_token: 'AAA' }, ip: '9.9.9.9' });
  const t4 = await g.getTracker({ originalUrl: '/api/auth/login', headers: { authorization: 'Bearer AAA' }, ip: '1.1.1.1' });
  const t5 = await g.getTracker({ originalUrl: '/api/wallet/meter-tick', headers: {}, ip: '2.2.2.2' });
  ok(t1 !== t2, 'two viewers behind one IP get separate meter-tick buckets');
  ok(t1 === t3, 'cookie and bearer of the same token share a bucket');
  ok(t4 === '1.1.1.1', 'other routes stay keyed by IP');
  ok(t5 === '2.2.2.2', 'meter-tick without token falls back to IP');

  // N11 blacklist survives a Redis restart (previously retryStrategy:null = never reconnect)
  let r = startRedis(); await sleep(600);
  if (r && r.pid) {
    process.env.REDIS_URL = 'redis://127.0.0.1:6391';
    const a = new TokenBlacklistService(); a.onModuleInit();
    const b = new TokenBlacklistService(); b.onModuleInit(); // second "instance"
    await sleep(500);
    await a.revokeToken('jti-1', 300);
    ok(await b.isRevoked('jti-1'), 'revocation visible to a second instance via Redis');
    try { r.kill(); } catch {}
    await sleep(800);
    r = startRedis(); await sleep(6000);
    await a.revokeToken('jti-2', 300);
    ok(await b.isRevoked('jti-2'), 'after Redis restart, instances reconnect and share revocations again');
    a.onModuleDestroy(); b.onModuleDestroy();
    try { r?.kill(); } catch {}
  } else {
    const a = new TokenBlacklistService(); a.onModuleInit();
    await a.revokeToken('jti-mem-1', 300);
    ok(await a.isRevoked('jti-mem-1'), 'in-memory revocation works when Redis daemon is not installed on host');
    a.onModuleDestroy();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
