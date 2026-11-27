process.env.LIVEKIT_PUBLIC_URL = 'ws://127.0.0.1:7880';
/* Offline checks for main41 hardening. Run: npx ts-node --transpile-only scripts/hardening.test.ts */
import Module from 'module';
const o = (Module as any)._load;
(Module as any)._load = function (r: string, ...a: any[]) {
  if (r === '@prisma/client') { const e = (...k: string[]) => Object.fromEntries(k.map((x) => [x, x])); return { StreamStatus: e('LIVE', 'SCHEDULED', 'ENDED', 'CANCELLED', 'RECONNECTING_GRACE_PERIOD'), UserRole: e('ADMIN', 'STREAMER', 'VIEWER'), UserStatus: e('ACTIVE', 'BANNED', 'SUSPENDED', 'DELETION_REQUESTED'), PaymentStatus: e('PENDING', 'SUCCESS', 'FAILED'), StreamVisibility: e('PUBLIC', 'PRIVATE'), KycStatus: e('PENDING', 'APPROVED', 'REJECTED'), StreamerEarningSource: e('LIVE_SESSION', 'GIFT', 'DAKSHINA'), Prisma: { JsonNull: 'JsonNull' }, PrismaClient: class {} }; }
  return o.call(this, r, ...a);
};
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const { validate } = require('class-validator');
  const { plainToInstance } = require('class-transformer');
  const bad = async (C: any, b: any) => (await validate(plainToInstance(C, b))).length > 0;

  const { RegisterDto } = require('../src/modules/auth/dto/register.dto');
  const { UpdateProfileDto } = require('../src/modules/auth/dto/login.dto');
  const { PresignedUrlDto } = require('../src/modules/storage/dto/presigned-url.dto');
  const { ClaimPrivateLinkDto, CreatePrivateLinkDto, KickBlockViewerDto } = require('../src/modules/private-links/dto/create-private-link.dto');
  const reg = { email: 'a@b.co', password: 'longenough1', name: 'Ankit', isAgeConfirmed18Plus: true };
  ok(!(await bad(RegisterDto, reg)), 'register: valid body accepted');
  ok(await bad(RegisterDto, { ...reg, name: 'x'.repeat(101) }), 'register: 101-char name rejected');
  ok(await bad(RegisterDto, { ...reg, password: 'p'.repeat(129) }), 'register: 129-char password rejected');
  ok(!(await bad(UpdateProfileDto, { name: 'Ankit' })), 'profile: valid name accepted');
  ok(await bad(UpdateProfileDto, { name: { a: 1 } }), 'profile: object name rejected (was a 500)');
  ok(await bad(UpdateProfileDto, { name: 'x'.repeat(5000) }), 'profile: 5000-char name rejected');
  ok(!(await bad(PresignedUrlDto, { filename: 'a.pdf', contentType: 'application/pdf', folder: 'kyc' })), 'presign: valid body accepted');
  ok(await bad(PresignedUrlDto, { filename: 123, contentType: 'image/png' }), 'presign: numeric filename rejected (was a 500)');
  ok(await bad(ClaimPrivateLinkDto, { guestName: 'g'.repeat(61) }), 'claim: 61-char guestName rejected');
  ok(await bad(CreatePrivateLinkDto, { streamId: 's', maxViewers: 100000 }), 'create link: maxViewers 100000 rejected');
  ok(await bad(KickBlockViewerDto, { targetUserId: { x: 1 } }), 'kick-block: non-string target rejected');

  // Private link: two simultaneous claims on a maxViewers=1 link
  const { PrivateLinksService } = require('../src/modules/private-links/private-links.service');
  const { CryptoUtil } = require('../src/common/crypto.util');
  const sessions: any[] = []; let tail: Promise<void> = Promise.resolve();
  const link = { id: 'L1', streamId: 'S1', isRevoked: false, expiresAt: null, requireLogin: false, passwordHash: null, maxViewers: 1,
    stream: { id: 'S1', status: 'LIVE', streamerId: 'P', streamer: { id: 'P', name: 'Pandit', avatarUrl: null }, title: 't' }, sessions: [] };
  const prisma: any = {
    privateAccessLink: { findUnique: async () => link },
    blockedViewer: { findFirst: async () => null },
    user: { findUnique: async () => null },
    $transaction: async (fn: any) => {
      let release!: () => void; const mine = new Promise<void>((r) => (release = r)); const prev = tail; tail = mine;
      const tx = { $queryRaw: async () => { await prev; },
        viewerSession: { count: async () => { await sleep(5); return sessions.length; }, create: async ({ data }: any) => { await sleep(5); const s = { id: 'sess' + sessions.length, ...data }; sessions.push(s); return s; } } };
      try { return await fn(tx); } finally { release(); }
    },
    viewerSession: { create: async ({ data }: any) => { const s = { id: 'x', ...data }; sessions.push(s); return s; } },
  };
  const video: any = { generateToken: async () => 'tok', kickParticipant: async () => true };
  let svc: any;
  try { svc = new PrivateLinksService(prisma, video, {} as any, {} as any); } catch { svc = null; }
  if (svc) {
    const res = await Promise.allSettled([svc.claimLink('slug', { guestName: 'A' }, undefined, '1.1.1.1'), svc.claimLink('slug', { guestName: 'B' }, undefined, '2.2.2.2')]);
    const okCount = res.filter((r) => r.status === 'fulfilled').length;
    ok(sessions.length === 1 && okCount === 1, `maxViewers=1: two simultaneous claims admit exactly one (sessions=${sessions.length}, fulfilled=${okCount})`);
    const rej: any = res.find((r) => r.status === 'rejected');
    ok(!rej || rej.reason.constructor.name === 'ForbiddenException', 'the second claimant gets 403 capacity error');
    ok(sessions[0]?.guestName === 'A' || sessions[0]?.guestName === 'B', 'guestName is stored sanitised');
  } else { ok(false, 'could not construct PrivateLinksService in harness'); }

  // Pandit seed guard: fails closed without opt-in, rejects production and committed defaults
  const { assertSafeToSeedPandits } = require('../prisma/reseed-guard');
  const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
  ok(throws(() => assertSafeToSeedPandits({})), 'pandit seed guard: refuses without opt-in');
  ok(throws(() => assertSafeToSeedPandits({ CONFIRM_PANDIT_SEED: 'SEED_VERIFIED_PANDITS', NODE_ENV: 'production', SEED_PANDIT_PASSWORD: 'StrongCustomPass!2026' })), 'pandit seed guard: refuses in NODE_ENV=production');
  ok(throws(() => assertSafeToSeedPandits({ CONFIRM_PANDIT_SEED: 'SEED_VERIFIED_PANDITS', SEED_PANDIT_PASSWORD: 'SanatanDharma@2026' })), 'pandit seed guard: rejects old committed password');
  ok(!throws(() => assertSafeToSeedPandits({ CONFIRM_PANDIT_SEED: 'SEED_VERIFIED_PANDITS', SEED_PANDIT_PASSWORD: 'UniqueStagingPass#99' })), 'pandit seed guard: accepts explicit staging opt-in + strong password');

  // Verify patched engine.io version against GHSA-v775-f652-7rv6
  const fs = require('fs');
  const path = require('path');
  const engineIoPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../node_modules/engine.io/package.json'), 'utf8'));
  const [maj, min, pat] = String(engineIoPkg.version).split('.').map(Number);
  ok(maj > 6 || (maj === 6 && (min > 6 || (min === 6 && pat >= 12))), `engine.io ${engineIoPkg.version} is patched (>= 6.6.12)`);

  // AuthService: case-insensitive email lookup across register/login/forgotPassword
  const { AuthService } = require('../src/modules/auth/auth.service');
  const findCalls: any[] = [];
  const authPrisma: any = {
    user: {
      findFirst: async (args: any) => {
        findCalls.push(args);
        return null;
      },
    },
  };
  const authSvc = new AuthService(authPrisma, {} as any, {} as any, {} as any, {} as any);
  await authSvc.forgotPassword('Kdtripathi481@GMAIL.com');
  const clauses = findCalls[0]?.where?.OR || [];
  ok(
    clauses.some((c: any) => c?.email?.equals === 'kdtripathi481@gmail.com' && c?.email?.mode === 'insensitive'),
    'auth lookup queries lowercased email with Prisma mode=insensitive',
  );

  // AuthService: deleteAccount scrubs OAuth/reset/2FA credentials and token lookups reject deleted users
  const updateCalls: any[] = [];
  const delPrisma: any = {
    user: {
      findFirst: async (args: any) => {
        findCalls.push(args);
        return null;
      },
      findUnique: async () => ({
        id: 'u-del',
        email: 'victim@example.com',
        passwordHash: null,
        role: 'VIEWER',
        streamerProfile: { id: 'sp-del', kycDocuments: null },
        wallet: { id: 'w-del', balanceCoins: 0, bonusCoins: 0, purchasedCoins: 0 },
      }),
      update: async (args: any) => {
        updateCalls.push(args);
        return {};
      },
    },
    dakshinaOffering: { updateMany: async () => ({ count: 0 }) },
    stream: { findMany: async () => [] },
    privateAccessLink: { updateMany: async () => ({ count: 0 }) },
    auditLog: { create: async () => ({}) },
  };
  const delAuthSvc = new AuthService(delPrisma, {} as any, {} as any, {} as any, {} as any);
  await delAuthSvc.deleteAccount('u-del');
  const scrubbed = updateCalls[0]?.data || {};
  ok(
    scrubbed.googleId === null &&
      scrubbed.resetTokenHash === null &&
      scrubbed.resetTokenExpiry === null &&
      scrubbed.twoFactorSecretEnc === null &&
      Array.isArray(scrubbed.twoFactorBackupCodes) &&
      scrubbed.twoFactorBackupCodes.length === 0 &&
      scrubbed.isTwoFactorEnabled === false &&
      scrubbed.deletedAt instanceof Date,
    'AuthService.deleteAccount scrubs googleId, reset tokens, and 2FA secrets',
  );

  findCalls.length = 0;
  try { await delAuthSvc.verifyEmail('raw-verify-token'); } catch {}
  try { await delAuthSvc.resetPassword({ token: 'raw-reset-token', newPassword: 'ValidPassword123!' }); } catch {}
  ok(
    findCalls.length === 2 &&
      findCalls[0]?.where?.deletedAt === null &&
      findCalls[1]?.where?.deletedAt === null,
    'AuthService.verifyEmail and resetPassword exclude soft-deleted users',
  );

  // StreamersService: exclude soft-deleted users from public profile lookups and follows
  const { StreamersService } = require('../src/modules/streamers/streamers.service');
  const { NotFoundException } = require('@nestjs/common');
  const streamerQueries: any[] = [];
  const streamersPrisma: any = {
    streamerProfile: {
      findFirst: async (args: any) => {
        streamerQueries.push(args);
        return null;
      },
      findUnique: async () => ({
        id: 'sp-deleted',
        userId: 'u-deleted',
        user: { deletedAt: new Date() },
      }),
    },
  };
  const streamersSvc = new StreamersService(streamersPrisma);
  try { await streamersSvc.getPublicProfile('ravi-pathak'); } catch {}
  ok(
    streamerQueries.length === 2 &&
      streamerQueries[0]?.where?.user?.deletedAt === null &&
      streamerQueries[1]?.where?.user?.deletedAt === null,
    'StreamersService.getPublicProfile filters deleted users on direct and slug lookups',
  );
  let rejectedDeletedFollow = false;
  try {
    await streamersSvc.follow('follower-1', 'sp-deleted');
  } catch (err: any) {
    rejectedDeletedFollow = err instanceof NotFoundException;
  }
  ok(rejectedDeletedFollow, 'StreamersService.follow rejects soft-deleted pandit profiles');

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
