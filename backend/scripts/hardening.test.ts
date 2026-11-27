process.env.LIVEKIT_PUBLIC_URL = 'ws://127.0.0.1:7880';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'offline_test_access_secret_key_min_32c';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'offline_test_refresh_secret_key_min_32c';
process.env.ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || Buffer.alloc(32, 7).toString('base64');
process.env.TWO_FACTOR_SECRET_KEY = process.env.TWO_FACTOR_SECRET_KEY || Buffer.alloc(32, 9).toString('base64');
/* Offline checks for main41 hardening. Run: npx ts-node --transpile-only scripts/hardening.test.ts */
import Module from 'module';
const o = (Module as any)._load;
(Module as any)._load = function (r: string, ...a: any[]) {
  if (r === '@prisma/client') { const e = (...k: string[]) => Object.fromEntries(k.map((x) => [x, x])); return { StreamStatus: e('LIVE', 'SCHEDULED', 'ENDED', 'CANCELLED', 'RECONNECTING_GRACE_PERIOD'), UserRole: e('ADMIN', 'STREAMER', 'VIEWER'), UserStatus: e('ACTIVE', 'BANNED', 'SUSPENDED', 'DELETION_REQUESTED'), PaymentStatus: e('PENDING', 'SUCCESS', 'FAILED'), StreamVisibility: e('PUBLIC', 'PRIVATE'), KycStatus: e('PENDING', 'APPROVED', 'REJECTED'), StreamerEarningSource: e('LIVE_SESSION', 'GIFT', 'DAKSHINA'), PoojaBookingStatus: e('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED'), Prisma: { JsonNull: 'JsonNull' }, PrismaClient: class {} }; }
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
    poojaBooking: {
      updateMany: async (args: any) => {
        updateCalls.push({ poojaBookingArgs: args });
        return { count: 1 };
      },
    },
    stream: { findMany: async () => [] },
    privateAccessLink: { updateMany: async () => ({ count: 0 }) },
    auditLog: { create: async () => ({}) },
  };
  const delAuthSvc = new AuthService(delPrisma, {} as any, {} as any, {} as any, {} as any);
  await delAuthSvc.deleteAccount('u-del');
  const scrubbed = updateCalls.find((c) => c.data)?.data || {};
  const poojaUpdateCalls = updateCalls.filter((c) => c.poojaBookingArgs).map((c) => c.poojaBookingArgs);
  ok(
    scrubbed.googleId === null &&
      scrubbed.resetTokenHash === null &&
      scrubbed.resetTokenExpiry === null &&
      scrubbed.twoFactorSecretEnc === null &&
      Array.isArray(scrubbed.twoFactorBackupCodes) &&
      scrubbed.twoFactorBackupCodes.length === 0 &&
      scrubbed.isTwoFactorEnabled === false &&
      scrubbed.deletedAt instanceof Date &&
      poojaUpdateCalls.some((c) => c?.where?.devoteeId === 'u-del' && c?.data?.devoteeName === 'Deleted Devotee') &&
      poojaUpdateCalls.some((c) => c?.where?.panditId === 'u-del' && c?.data?.status === 'CANCELLED'),
    'AuthService.deleteAccount scrubs OAuth/2FA secrets and redacts/cancels PoojaBooking records',
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

  // StreamersService: resolve via permanent DB slug without name fallback, and exclude deleted/pending-deletion users
  const { StreamersService } = require('../src/modules/streamers/streamers.service');
  const { buildStreamerSlugBase, resolveUniqueStreamerSlug } = require('../src/common/streamer-slug.util');
  const { NotFoundException, BadRequestException, UnauthorizedException } = require('@nestjs/common');
  const streamerQueries: any[] = [];
  const streamersPrisma: any = {
    streamerProfile: {
      findFirst: async (args: any) => {
        streamerQueries.push(args);
        if (args?.where?.slug === 'rohit-tiwari') return { userId: 'u-other' };
        return null;
      },
      findUnique: async () => ({
        id: 'sp-deleted',
        userId: 'u-deleted',
        user: { deletedAt: new Date(), status: 'ACTIVE' },
      }),
    },
  };
  const streamersSvc = new StreamersService(streamersPrisma);
  try { await streamersSvc.getPublicProfile('ravi-pathak'); } catch {}
  ok(
    streamerQueries.length === 1 &&
      Array.isArray(streamerQueries[0]?.where?.OR) &&
      streamerQueries[0].where.OR.some((c: any) => c?.slug === 'ravi-pathak') &&
      streamerQueries[0]?.where?.user?.deletedAt === null &&
      streamerQueries[0]?.where?.user?.status?.not === 'DELETION_REQUESTED',
    'StreamersService.getPublicProfile resolves permanent slug in one query excluding deleted/pending users',
  );
  let rejectedDeletedFollow = false;
  try {
    await streamersSvc.follow('follower-1', 'sp-deleted');
  } catch (err: any) {
    rejectedDeletedFollow = err instanceof NotFoundException;
  }
  ok(rejectedDeletedFollow, 'StreamersService.follow rejects soft-deleted pandit profiles');

  ok(
    buildStreamerSlugBase('पंडित अरुण', '1234abcd-0000-0000-0000-000000000000') === 'pandit-1234abcd' &&
      (await resolveUniqueStreamerSlug(streamersPrisma, 'Rohit Tiwari', 'u-new')) === 'rohit-tiwari-2',
    'Streamer slug helper handles Devanagari fallback and deduplicates collisions',
  );

  // Pandit pending deletion + Admin approval gated by dueCoins === 0
  const panditUpdates: any[] = [];
  const panditAudits: any[] = [];
  const panditLoginHash = await require('bcryptjs').hash('SecretPass123!', 4);
  const panditPrisma: any = {
    user: {
      findFirst: async () => ({
        id: 'u-pandit',
        email: 'pandit@example.com',
        passwordHash: panditLoginHash,
        status: 'DELETION_REQUESTED',
        deletedAt: null,
      }),
      findUnique: async () => ({
        id: 'u-pandit',
        email: 'pandit@example.com',
        name: 'Pandit Test',
        passwordHash: null,
        role: 'STREAMER',
        status: 'ACTIVE',
        deletedAt: null,
        streamerProfile: { id: 'sp-p', slug: 'pandit-test', kycStatus: 'APPROVED', kycDocuments: null },
        wallet: { id: 'w-p', balanceCoins: 50, bonusCoins: 50, purchasedCoins: 0 },
      }),
      update: async (args: any) => { panditUpdates.push(args); return {}; },
    },
    streamerEarning: { aggregate: async () => ({ _sum: { coins: 300 } }) },
    panditPayout: { aggregate: async () => ({ _sum: { coins: 150 } }) },
    stream: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    privateAccessLink: { updateMany: async () => ({ count: 0 }) },
    auditLog: { create: async (args: any) => { panditAudits.push(args); return {}; } },
    $transaction: async (opsOrFn: any) => (typeof opsOrFn === 'function' ? opsOrFn(panditPrisma) : Promise.all(opsOrFn)),
  };
  const panditAuthSvc = new AuthService(panditPrisma, {} as any, {} as any, {} as any, {} as any);
  const reqRes = await panditAuthSvc.deleteAccount('u-pandit');
  ok(
    reqRes.pendingApproval === true &&
      reqRes.dueCoins === 150 &&
      panditUpdates[0]?.data?.status === 'DELETION_REQUESTED' &&
      panditUpdates[0]?.data?.deletionRequestedAt instanceof Date &&
      panditUpdates[0]?.data?.deletedAt === undefined &&
      panditAudits[0]?.data?.action === 'DPDP_PANDIT_DELETION_REQUESTED',
    'Pandit deleteAccount queues pending admin approval without erasing payout-identifying details',
  );

  let pendingLoginBlocked = false;
  try {
    await panditAuthSvc.login({ email: 'pandit@example.com', password: 'SecretPass123!' });
  } catch (err: any) {
    pendingLoginBlocked = err instanceof UnauthorizedException;
  }
  ok(pendingLoginBlocked, 'Login blocks pandits with DELETION_REQUESTED status awaiting approval');

  const { AdminService } = require('../src/modules/admin/admin.service');
  let paidForApproval = 150;
  let adminErasureState: any = {
    id: 'u-pandit',
    email: 'pandit@example.com',
    name: 'Pandit Test',
    role: 'STREAMER',
    status: 'DELETION_REQUESTED',
    deletedAt: null,
    deletionRequestedAt: new Date(),
    streamerProfile: { id: 'sp-p', slug: 'pandit-test', kycStatus: 'APPROVED', kycDocuments: [{ storageKey: 'kyc/p1_doc.pdf' }] },
    wallet: { id: 'w-p', balanceCoins: 100, bonusCoins: 50, purchasedCoins: 50 },
  };
  const deletedKycKeys: string[] = [];
  const adminApprovalUpdates: any[] = [];
  const adminPrisma: any = {
    $queryRaw: async () => [],
    $transaction: async (opsOrFn: any) => (typeof opsOrFn === 'function' ? opsOrFn(adminPrisma) : Promise.all(opsOrFn)),
    user: {
      findUnique: async () => adminErasureState,
      update: async (args: any) => { adminApprovalUpdates.push(args); adminErasureState = { ...adminErasureState, ...args.data }; return adminErasureState; },
      count: async () => 2,
    },
    stream: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    streamerEarning: { aggregate: async () => ({ _sum: { coins: 300 } }) },
    panditPayout: { aggregate: async () => ({ _sum: { coins: paidForApproval } }) },
    dakshinaOffering: { updateMany: async () => ({ count: 0 }) },
    privateAccessLink: { updateMany: async () => ({ count: 0 }) },
    userWallet: { update: async () => ({}) },
    auditLog: { create: async () => ({}) },
  };
  const adminSvc = new AdminService(adminPrisma, { endRoom: async () => true } as any, {} as any, {
    deleteFile: async (k: string) => { deletedKycKeys.push(k); },
  } as any);

  let blockedByDueCoins = false;
  try {
    await adminSvc.approvePanditDeletion('u-pandit', 'admin-1', 'admin@paramdarshan.com');
  } catch (err: any) {
    blockedByDueCoins = err instanceof BadRequestException && /150\s+coins/i.test(err.message);
  }
  ok(
    blockedByDueCoins && adminErasureState.deletedAt === null && deletedKycKeys.length === 0,
    'AdminService.approvePanditDeletion blocks approval while dueCoins > 0',
  );

  paidForApproval = 300;
  const approvedRes = await adminSvc.approvePanditDeletion('u-pandit', 'admin-1', 'admin@paramdarshan.com');
  const finalUpdate = adminApprovalUpdates[adminApprovalUpdates.length - 1]?.data || {};
  ok(
    approvedRes.dueCoins === 0 &&
      finalUpdate.deletedAt instanceof Date &&
      finalUpdate.streamerProfile?.update?.slug === null &&
      deletedKycKeys[0] === 'kyc/p1_doc.pdf',
    'AdminService.approvePanditDeletion erases pandit & KYC once dueCoins === 0',
  );

  let rejectErasedBlocked = false;
  try {
    await adminSvc.rejectPanditDeletion('u-pandit', 'admin-1', 'admin@paramdarshan.com');
  } catch (err: any) {
    rejectErasedBlocked = err instanceof BadRequestException;
  }
  ok(rejectErasedBlocked, 'AdminService.rejectPanditDeletion refuses restoring an already erased account');

  // --- AuthService: getMeExtras (Pandit-Admin + Last-Admin), changePassword, logoutAll, disable2FA ---
  const throwsAsync = async (fn: () => Promise<unknown>) => { try { await fn(); return false; } catch { return true; } };
  const { ForbiddenException } = require('@nestjs/common');
  const { isTokenIssuedBeforePasswordChange } = require('../src/common/token-freshness.util');
  const bcrypt = require('bcryptjs');
  const initialHash = await bcrypt.hash('OldPass!123', 4);
  let activeAdminCount = 1;
  const authState: any = {
    id: 'u-rohit',
    name: 'Pandit Rohit Tiwari',
    email: 'tripathiayush068@gmail.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    deletedAt: null,
    isEmailVerified: true,
    isTwoFactorEnabled: true,
    emailNotification: true,
    preferredLanguage: 'en',
    passwordHash: initialHash,
    passwordChangedAt: null,
    twoFactorSecretEnc: CryptoUtil.encryptAesGcm('JBSWY3DPEHPK3PXP'),
    twoFactorBackupCodes: [],
    streamerProfile: { id: 'sp-rt', kycStatus: 'APPROVED', slug: 'rohit-tiwari', specialBadgeTitle: 'Chief Acharya' },
  };
  const authSecAudits: any[] = [];
  const authSecPrisma: any = {
    user: {
      findUnique: async () => authState,
      count: async () => activeAdminCount,
      update: async (args: any) => {
        Object.assign(authState, args.data);
        return { ...authState };
      },
    },
    auditLog: { create: async (args: any) => { authSecAudits.push(args); return {}; } },
  };
  const mockJwt = { sign: (payload: any) => JSON.stringify(payload) };
  const authSecSvc = new AuthService(authSecPrisma, mockJwt as any, {} as any, {} as any, {} as any);

  const me1 = await authSecSvc.getMeExtras('u-rohit');
  ok(
    me1.hasPassword === true &&
      me1.isLastAdmin === true &&
      me1.streamerProfile?.kycStatus === 'APPROVED' &&
      me1.streamerProfile?.slug === 'rohit-tiwari' &&
      !('passwordHash' in me1),
    'AuthService.getMeExtras exposes Pandit-Admin profile, isLastAdmin=true, and strips secrets',
  );
  activeAdminCount = 2;
  const me2 = await authSecSvc.getMeExtras('u-rohit');
  ok(me2.isLastAdmin === false, 'AuthService.getMeExtras sets isLastAdmin=false when multiple admins exist');

  ok(
    await throwsAsync(() => authSecSvc.changePassword('u-rohit', { currentPassword: 'WrongPassword!', newPassword: 'NewPassword!456' })),
    'AuthService.changePassword rejects incorrect current password',
  );
  const cpRes = await authSecSvc.changePassword('u-rohit', { currentPassword: 'OldPass!123', newPassword: 'NewPassword!456' });
  const cpClaims = JSON.parse(cpRes.accessToken);
  const pwChangedAt1 = authState.passwordChangedAt as Date;
  ok(
    pwChangedAt1 instanceof Date &&
      isTokenIssuedBeforePasswordChange(cpClaims.iat - 1, pwChangedAt1) === true &&
      isTokenIssuedBeforePasswordChange(cpClaims.iat, pwChangedAt1) === false &&
      authSecAudits.some((a) => a?.data?.action === 'PASSWORD_CHANGED'),
    'AuthService.changePassword rotates passwordChangedAt and keeps new token valid while revoking older tokens',
  );

  const laRes = await authSecSvc.logoutAllOtherDevices('u-rohit');
  const laClaims = JSON.parse(laRes.accessToken);
  const pwChangedAt2 = authState.passwordChangedAt as Date;
  ok(
    pwChangedAt2.getTime() > pwChangedAt1.getTime() &&
      isTokenIssuedBeforePasswordChange(cpClaims.iat, pwChangedAt2) === true &&
      isTokenIssuedBeforePasswordChange(laClaims.iat, pwChangedAt2) === false &&
      authSecAudits.some((a) => a?.data?.action === 'SESSION_LOGOUT_ALL'),
    'AuthService.logoutAllOtherDevices advances rotation second even within same second and revokes prior token',
  );

  let adminDisableBlocked = false;
  try {
    await authSecSvc.disableTwoFactor('u-rohit', { password: 'NewPassword!456', token: 'BACKUP01' });
  } catch (err: any) {
    adminDisableBlocked = err instanceof ForbiddenException;
  }
  ok(adminDisableBlocked, 'AuthService.disableTwoFactor forbids ADMIN accounts from disabling 2FA');

  authState.role = 'VIEWER';
  authState.twoFactorBackupCodes = [CryptoUtil.hashSha256('BACKUP01')];
  await authSecSvc.disableTwoFactor('u-rohit', { password: 'NewPassword!456', token: 'BACKUP01' });
  ok(
    authState.isTwoFactorEnabled === false &&
      authState.twoFactorSecretEnc === null &&
      Array.isArray(authState.twoFactorBackupCodes) &&
      authState.twoFactorBackupCodes.length === 0,
    'AuthService.disableTwoFactor disables 2FA for non-Admin users using password + valid backup code',
  );

  // --- PoojaBookingsService: create, slug resolution, self-booking guard, Pandit-Admin approve/decline, cancel ---
  const { PoojaBookingsService } = require('../src/modules/pooja-bookings/pooja-bookings.service');
  const { CreatePoojaBookingDto, RespondPoojaBookingDto } = require('../src/modules/pooja-bookings/dto/pooja-booking.dto');
  ok(
    !(await bad(CreatePoojaBookingDto, {
      panditIdOrSlug: 'rohit-tiwari',
      poojaId: 'rudrabhishek',
      poojaName: 'Maha Rudrabhishek',
      devoteeName: 'Devotee',
      scheduledDate: '2026-12-01',
      timeSlot: 'Morning',
      sankalpIntent: 'Family peace',
    })),
    'CreatePoojaBookingDto accepts valid booking payload',
  );
  ok(
    await bad(RespondPoojaBookingDto, { decision: 'INVALID_STATUS' }),
    'RespondPoojaBookingDto rejects unknown decision value',
  );

  const pbUsers: Record<string, any> = {
    'u-devotee': { id: 'u-devotee', name: 'Ankit Devotee', email: 'dev@example.com', role: 'VIEWER', status: 'ACTIVE', deletedAt: null, streamerProfile: null },
    'u-rohit': { id: 'u-rohit', name: 'Pandit Rohit Tiwari', email: 'tripathiayush068@gmail.com', role: 'ADMIN', status: 'ACTIVE', deletedAt: null, avatarUrl: '/images/pandits/pandit-rohit-tiwari.webp', streamerProfile: { id: 'sp-rt', userId: 'u-rohit', slug: 'rohit-tiwari', kycStatus: 'APPROVED', specialBadgeTitle: 'Chief Acharya' } },
    'u-other': { id: 'u-other', name: 'Pandit Ravi', email: 'ravi@example.com', role: 'STREAMER', status: 'ACTIVE', deletedAt: null, streamerProfile: { id: 'sp-rv', userId: 'u-other', slug: 'ravi-pathak', kycStatus: 'APPROVED', specialBadgeTitle: 'Vedic Acharya' } },
  };
  const pbRows: any[] = [];
  const pbAudits: any[] = [];
  const pbPrisma: any = {
    user: {
      findUnique: async ({ where }: any) => pbUsers[where.id] || null,
    },
    streamerProfile: {
      findFirst: async ({ where }: any) => {
        const ors = where?.OR || [];
        return (
          Object.values(pbUsers)
            .map((u: any) => (u.streamerProfile ? { ...u.streamerProfile, user: u } : null))
            .find(
              (sp: any) =>
                sp &&
                sp.kycStatus === where?.kycStatus &&
                ors.some((o: any) => o.userId === sp.userId || o.id === sp.id || (o.slug && o.slug === sp.slug)),
            ) || null
        );
      },
    },
    poojaBooking: {
      create: async ({ data }: any) => {
        const row = {
          id: `pb-${pbRows.length + 1}`,
          createdAt: new Date(),
          confirmedAt: null,
          confirmedTime: null,
          roomLink: null,
          declineReason: null,
          ...data,
          pandit: pbUsers[data.panditId],
          streamerProfile: pbUsers[data.panditId]?.streamerProfile,
        };
        pbRows.push(row);
        return row;
      },
      findMany: async ({ where }: any) =>
        pbRows.filter((r) => (!where.devoteeId || r.devoteeId === where.devoteeId) && (!where.panditId || r.panditId === where.panditId) && (!where.status?.not || r.status !== where.status.not)),
      findUnique: async ({ where }: any) => pbRows.find((r) => r.id === where.id) || null,
      update: async ({ where, data }: any) => {
        const row = pbRows.find((r) => r.id === where.id);
        Object.assign(row, data);
        return row;
      },
    },
    auditLog: { create: async (args: any) => { pbAudits.push(args); return {}; } },
  };
  const pbSvc = new PoojaBookingsService(pbPrisma);

  const createdPb = await pbSvc.createBooking('u-devotee', {
    panditIdOrSlug: '73b080c9-8bfb-41e6-8c5a-dba40c9409c5',
    poojaId: 'rudrabhishek',
    poojaName: 'Maha Rudrabhishek',
    category: 'Shiva',
    dakshinaCoins: 150,
    devoteeName: 'Ankit Devotee',
    devoteeGotra: 'Bharadwaj',
    scheduledDate: '2026-12-01',
    timeSlot: 'Morning (07:00 AM)',
    sankalpIntent: 'Family wellbeing',
  });
  ok(
    createdPb.status === 'PENDING' && createdPb.panditId === 'u-rohit' && createdPb.panditSlug === 'rohit-tiwari',
    'PoojaBookingsService.createBooking resolves legacy catalog ID to verified Pandit-Admin and saves PENDING request',
  );

  ok(
    await throwsAsync(() =>
      pbSvc.createBooking('u-rohit', {
        panditIdOrSlug: 'rohit-tiwari',
        poojaId: 'rudrabhishek',
        poojaName: 'Maha Rudrabhishek',
        devoteeName: 'Self',
        scheduledDate: '2026-12-01',
        timeSlot: 'Morning',
        sankalpIntent: 'Test',
      }),
    ),
    'PoojaBookingsService.createBooking blocks self-booking',
  );

  ok(
    await throwsAsync(() => pbSvc.getStreamerRequests('u-devotee')),
    'PoojaBookingsService.getStreamerRequests blocks regular devotee accounts',
  );

  const rohitInbox = await pbSvc.getStreamerRequests('u-rohit');
  ok(
    rohitInbox.length === 1 && rohitInbox[0].id === createdPb.id,
    'PoojaBookingsService.getStreamerRequests admits Pandit-Admin and returns incoming devotee booking',
  );

  ok(
    await throwsAsync(() => pbSvc.respondToRequest('u-other', createdPb.id, { decision: 'APPROVED' })),
    'PoojaBookingsService.respondToRequest blocks other pandits from approving someone else’s booking',
  );

  const approvedPb = await pbSvc.respondToRequest('u-rohit', createdPb.id, {
    decision: 'APPROVED',
    confirmedTime: '2026-12-01 07:30 AM IST',
  });
  ok(
    approvedPb.status === 'APPROVED' &&
      approvedPb.confirmedTime === '2026-12-01 07:30 AM IST' &&
      pbAudits.some((a) => a?.data?.action === 'PANDIT_BOOKING_APPROVED'),
    'PoojaBookingsService.respondToRequest allows Pandit-Admin to approve and logs PANDIT_BOOKING_APPROVED',
  );

  ok(
    await throwsAsync(() => pbSvc.respondToRequest('u-rohit', createdPb.id, { decision: 'DECLINED' })),
    'PoojaBookingsService.respondToRequest rejects duplicate transitions after decision',
  );
  ok(
    await throwsAsync(() => pbSvc.cancelMyBooking('u-devotee', createdPb.id)),
    'PoojaBookingsService.cancelMyBooking prevents cancelling an already-approved booking',
  );

  const pendingPb = await pbSvc.createBooking('u-devotee', {
    panditIdOrSlug: 'ravi-pathak',
    poojaId: 'navgraha',
    poojaName: 'Navgraha Shanti',
    devoteeName: 'Ankit Devotee',
    scheduledDate: '2026-12-02',
    timeSlot: 'Evening',
    sankalpIntent: 'Peace',
  });
  await pbSvc.cancelMyBooking('u-devotee', pendingPb.id);
  const myVisible = await pbSvc.getMyBookings('u-devotee');
  ok(
    myVisible.length === 1 && myVisible[0].id === createdPb.id,
    'PoojaBookingsService.cancelMyBooking cancels PENDING booking and excludes it from getMyBookings',
  );

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
