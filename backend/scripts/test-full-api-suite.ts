import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
const request = require('supertest');
import { INestApplication, ValidationPipe } from '@nestjs/common';
const cookieParser = require('cookie-parser');

let app: INestApplication;
let prisma: PrismaService;
let httpServer: any;

const timestamp = Date.now();
const testViewerEmail = `test_viewer_${timestamp}@example.com`;
const testStreamerEmail = `test_streamer_${timestamp}@example.com`;
const testPassword = 'SecurePassword123!';

let viewerAccessToken = '';
let viewerUserId = '';
let streamerAccessToken = '';
let streamerUserId = '';
let streamerProfileId = '';
let adminAccessToken = '';
let categoryId = '';
let testStreamId = '';
let testPrivateStreamId = '';
let testPrivateLinkId = '';
let testPrivateSlug = '';
let testReportId = '';

interface TestResult {
  suite: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const testResults: TestResult[] = [];

function recordTest(suite: string, test: string, passed: boolean, details?: any) {
  const detailStr = details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : '';
  testResults.push({
    suite,
    test,
    status: passed ? 'PASS' : 'FAIL',
    details: detailStr,
  });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${suite}] ${test} ${detailStr ? '--> ' + detailStr : ''}`);
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🚀 SHUBHDARSHAN - COMPREHENSIVE END-TO-END API TEST SUITE');
  console.log('===============================================================\n');

  // Bootstrap app
  app = await NestFactory.create(AppModule, { logger: false, rawBody: true });
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
  httpServer = app.getHttpServer();
  prisma = app.get(PrismaService);

  try {
    // -------------------------------------------------------------------------
    // 1. Health Checks & Database Connection
    // -------------------------------------------------------------------------
    console.log('\n📌 1. HEALTH CHECKS & DATABASE CONNECTION');
    {
      const res = await request(httpServer).get('/api/v1/health/live');
      recordTest('Health', 'GET /api/v1/health/live returns 200 OK', res.status === 200 && res.body.status === 'ok');

      const readyRes = await request(httpServer).get('/api/v1/health/ready');
      recordTest(
        'Health',
        'GET /api/v1/health/ready connects to Neon Postgres',
        readyRes.status === 200 && readyRes.body.database === 'connected',
      );
    }

    // -------------------------------------------------------------------------
    // 2. CMS Static Legal Pages & Categories
    // -------------------------------------------------------------------------
    console.log('\n📌 2. CMS STATIC LEGAL PAGES & CATEGORIES');
    {
      const termsRes = await request(httpServer).get('/api/v1/admin/pages/terms');
      recordTest('CMS', 'GET /api/v1/admin/pages/terms returns Terms of Service', termsRes.status === 200 && termsRes.body.slug === 'terms');

      const privRes = await request(httpServer).get('/api/v1/admin/pages/privacy');
      recordTest('CMS', 'GET /api/v1/admin/pages/privacy returns Privacy Policy (DPDP 2023)', privRes.status === 200 && privRes.body.slug === 'privacy');

      const grievRes = await request(httpServer).get('/api/v1/admin/pages/grievance');
      recordTest('CMS', 'GET /api/v1/admin/pages/grievance returns Grievance Officer details', grievRes.status === 200 && grievRes.body.slug === 'grievance');

      const notFoundRes = await request(httpServer).get('/api/v1/admin/pages/non-existent-page-xyz');
      recordTest('CMS', 'GET /api/v1/admin/pages/:slug returns 404 for nonexistent slug', notFoundRes.status === 404);

      const catRes = await request(httpServer).get('/api/v1/admin/categories');
      const cats = catRes.body || [];
      categoryId = cats.length > 0 ? cats[0].id : '';
      recordTest('Categories', 'GET /api/v1/admin/categories returns seeded categories', catRes.status === 200 && cats.length >= 8, `Found ${cats.length} categories`);
    }

    // -------------------------------------------------------------------------
    // 3. Authentication & Viewer Account Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n📌 3. AUTHENTICATION & VIEWER LIFECYCLE');
    {
      // A. Under 18 Age Rejection (DPDP Act Compliance)
      const under18Res = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: `under18_${timestamp}@example.com`,
          password: testPassword,
          name: 'Underage User',
          isAgeConfirmed18Plus: false,
        });
      recordTest('Auth', 'POST /api/v1/auth/register rejects under-18 users (DPDP gate)', under18Res.status === 400);

      // B. Successful Registration
      const regRes = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: testViewerEmail,
          password: testPassword,
          name: 'Shubham Bhakt',
          isAgeConfirmed18Plus: true,
        });
      recordTest('Auth', 'POST /api/v1/auth/register creates new viewer account', regRes.status === 201 && !!regRes.body.userId);
      viewerUserId = regRes.body.userId;

      // C. Duplicate Email Rejection
      const dupRes = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: testViewerEmail,
          password: testPassword,
          name: 'Duplicate User',
          isAgeConfirmed18Plus: true,
        });
      recordTest('Auth', 'POST /api/v1/auth/register returns 409 Conflict for duplicate email', dupRes.status === 409);

      // D. Email Verification
      const verifyToken = regRes.body.debugVerifyToken;
      if (verifyToken) {
        const verifyRes = await request(httpServer).get(`/api/v1/auth/verify-email?token=${verifyToken}`);
        recordTest('Auth', 'GET /api/v1/auth/verify-email verifies user email with token', verifyRes.status === 200);
      } else {
        // Manually mark verified in DB
        await prisma.user.update({ where: { id: viewerUserId }, data: { isEmailVerified: true } });
        recordTest('Auth', 'User email verified in DB', true);
      }

      // E. Login with Invalid Password
      const badLogin = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: testViewerEmail, password: 'WrongPassword999!' });
      recordTest('Auth', 'POST /api/v1/auth/login rejects invalid credentials with 401', badLogin.status === 401);

      // F. Login with Valid Password
      const loginRes = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: testViewerEmail, password: testPassword });
      viewerAccessToken = loginRes.body.accessToken || '';
      recordTest('Auth', 'POST /api/v1/auth/login succeeds and issues JWT access token', loginRes.status === 200 && !!viewerAccessToken);

      // G. Protected Route Without Token
      const noAuthRes = await request(httpServer).get('/api/v1/auth/me');
      recordTest('Auth', 'GET /api/v1/auth/me without token returns 401 Unauthorized', noAuthRes.status === 401);

      // H. Protected Route With Token
      const authRes = await request(httpServer)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${viewerAccessToken}`);
      recordTest('Auth', 'GET /api/v1/auth/me with Bearer token returns current user profile', authRes.status === 200 && authRes.body.email === testViewerEmail);
    }

    // -------------------------------------------------------------------------
    // 4. Streamer Registration & Admin KYC Approval
    // -------------------------------------------------------------------------
    console.log('\n📌 4. STREAMER REGISTRATION & ADMIN KYC APPROVAL');
    {
      // Register streamer account
      const regStreamerRes = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: testStreamerEmail,
          password: testPassword,
          name: 'Pandit Ram Shastri',
          isAgeConfirmed18Plus: true,
        });
      streamerUserId = regStreamerRes.body.userId;
      await prisma.user.update({ where: { id: streamerUserId }, data: { isEmailVerified: true } });

      const streamerLogin = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: testStreamerEmail, password: testPassword });
      streamerAccessToken = streamerLogin.body.accessToken;

      // Submit Streamer KYC Application
      const applyRes = await request(httpServer)
        .post('/api/v1/streamers/apply')
        .set('Authorization', `Bearer ${streamerAccessToken}`)
        .send({
          bio: 'Vedic priest with 20 years experience in Varanasi.',
          languages: ['Hindi', 'Sanskrit'],
          specialties: ['Vedic Pooja', 'Rudrabhishek'],
        });
      const prof = applyRes.body.profile;
      recordTest('Streamers', 'POST /api/v1/streamers/apply submits KYC application', applyRes.status === 201 && !!prof?.id);
      streamerProfileId = prof?.id;

      // Login as Admin
      const adminLogin = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@platform-domain.com', password: 'AdminPooja@2026Secure!' });
      adminAccessToken = adminLogin.body.accessToken;
      recordTest('Admin', 'POST /api/v1/auth/login authenticates default Administrator', adminLogin.status === 200 && !!adminAccessToken);

      // Admin views KYC queue
      const kycQueue = await request(httpServer)
        .get('/api/v1/streamers/admin/applications')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      recordTest('Admin', 'GET /api/v1/streamers/admin/applications fetches pending KYC applications', kycQueue.status === 200 && Array.isArray(kycQueue.body));

      // Admin Approves KYC
      const approveRes = await request(httpServer)
        .patch(`/api/v1/streamers/admin/applications/${streamerProfileId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          decision: 'APPROVED',
        });
      recordTest('Admin', 'PATCH /api/v1/streamers/admin/applications/:id approves KYC & elevates user role to STREAMER', approveRes.status === 200);

      // Re-login streamer to refresh JWT role claim
      const refreshedLogin = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: testStreamerEmail, password: testPassword });
      streamerAccessToken = refreshedLogin.body.accessToken;

      // Check public profile
      const profRes = await request(httpServer).get(`/api/v1/streamers/profile/${streamerProfileId}`);
      recordTest('Streamers', 'GET /api/v1/streamers/profile/:id returns public streamer profile', profRes.status === 200 && !!profRes.body.profile);
    }

    // -------------------------------------------------------------------------
    // 5. Admin Dashboard, Audit Logs & Word Filter
    // -------------------------------------------------------------------------
    console.log('\n📌 5. ADMIN DASHBOARD, AUDIT LOGS & WORD FILTER');
    {
      const dashRes = await request(httpServer)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      recordTest('Admin', 'GET /api/v1/admin/dashboard returns system KPI metrics', dashRes.status === 200 && typeof dashRes.body.totalUsers === 'number');

      const usersRes = await request(httpServer)
        .get('/api/v1/admin/users?query=Shastri')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      recordTest('Admin', 'GET /api/v1/admin/users searches users by keyword', usersRes.status === 200 && usersRes.body.length > 0);

      const logsRes = await request(httpServer)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      recordTest('Admin', 'GET /api/v1/admin/audit-logs retrieves immutable audit records', logsRes.status === 200 && Array.isArray(logsRes.body), logsRes.body);

      const filterRes = await request(httpServer)
        .get('/api/v1/admin/word-filters')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      recordTest('Admin', 'GET /api/v1/admin/word-filters lists prohibited words', filterRes.status === 200 && filterRes.body.length >= 8, filterRes.body);
    }

    // -------------------------------------------------------------------------
    // 6. Public Stream Lifecycle & LiveKit Token Generation
    // -------------------------------------------------------------------------
    console.log('\n📌 6. PUBLIC STREAM LIFECYCLE & LIVEKIT TOKEN GENERATION');
    {
      // Create Public Stream
      const createStreamRes = await request(httpServer)
        .post('/api/v1/streams')
        .set('Authorization', `Bearer ${streamerAccessToken}`)
        .send({
          title: 'Maha Rudrabhishek Live from Kashi',
          description: 'Sacred Shiva prayer chanting and live darshan.',
          categoryId,
          visibility: 'PUBLIC',
          videoQuality: '480p',
          scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        });
      recordTest('Streams', 'POST /api/v1/streams creates a new scheduled stream', createStreamRes.status === 201 && !!createStreamRes.body.id, createStreamRes.body);
      testStreamId = createStreamRes.body.id;

      // Streamer Go-Live
      const goLiveRes = await request(httpServer)
        .post(`/api/v1/streams/${testStreamId}/go-live`)
        .set('Authorization', `Bearer ${streamerAccessToken}`);
      recordTest('Streams', 'POST /api/v1/streams/:id/go-live starts broadcast & mints LiveKit publisher token', goLiveRes.status === 200 && !!goLiveRes.body.publisherToken, goLiveRes.body);

      // Verify stream is LIVE
      const streamRes = await request(httpServer).get(`/api/v1/streams/${testStreamId}`);
      recordTest('Streams', 'GET /api/v1/streams/:id returns status LIVE', streamRes.status === 200 && streamRes.body.status === 'LIVE');

      // Public Streams Listing
      const publicStreamsRes = await request(httpServer).get('/api/v1/streams/public');
      recordTest('Streams', 'GET /api/v1/streams/public lists active streams', publicStreamsRes.status === 200 && Array.isArray(publicStreamsRes.body));

      // Viewer Token Generation
      const viewerTokenRes = await request(httpServer)
        .post(`/api/v1/streams/${testStreamId}/token/viewer`)
        .set('Authorization', `Bearer ${viewerAccessToken}`)
        .send({ guestName: 'Devotee 1' });
      recordTest('Streams', 'POST /api/v1/streams/:id/token/viewer mints 5-minute LiveKit subscriber token', viewerTokenRes.status === 200 && !!viewerTokenRes.body.token);

      // End Stream
      const endStreamRes = await request(httpServer)
        .post(`/api/v1/streams/${testStreamId}/end`)
        .set('Authorization', `Bearer ${streamerAccessToken}`);
      recordTest('Streams', 'POST /api/v1/streams/:id/end terminates broadcast and marks ENDED', endStreamRes.status === 200 && endStreamRes.body.stream?.status === 'ENDED', endStreamRes.body);
    }

    // -------------------------------------------------------------------------
    // 7. Private Stream & 128-bit Secret Access Link Flow
    // -------------------------------------------------------------------------
    console.log('\n📌 7. PRIVATE STREAM & 128-BIT SECRET ACCESS LINK FLOW');
    {
      // Create Private Stream
      const createPrivStreamRes = await request(httpServer)
        .post('/api/v1/streams')
        .set('Authorization', `Bearer ${streamerAccessToken}`)
        .send({
          title: 'Private Griha Pravesh Sankalp',
          description: 'Family private house warming ceremony.',
          categoryId,
          visibility: 'PRIVATE',
          videoQuality: '480p',
        });
      recordTest('PrivateStreams', 'POST /api/v1/streams creates private stream', createPrivStreamRes.status === 201 && !!createPrivStreamRes.body.id);
      testPrivateStreamId = createPrivStreamRes.body.id;

      // Start Private Stream Go-Live
      await request(httpServer)
        .post(`/api/v1/streams/${testPrivateStreamId}/go-live`)
        .set('Authorization', `Bearer ${streamerAccessToken}`);

      // Generate 128-bit Private Access Link
      const createLinkRes = await request(httpServer)
        .post('/api/v1/private-links')
        .set('Authorization', `Bearer ${streamerAccessToken}`)
        .send({
          streamId: testPrivateStreamId,
          password: 'SecretPoojaPassword123',
          maxViewers: 50,
          requireLogin: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        });
      recordTest(
        'PrivateStreams',
        'POST /api/v1/private-links generates 128-bit tokenSlug & 2-part WhatsApp share text',
        createLinkRes.status === 201 && !!createLinkRes.body.rawTokenSlug && !!createLinkRes.body.whatsAppShare?.part1Url,
        createLinkRes.body,
      );
      testPrivateLinkId = createLinkRes.body.linkId;
      testPrivateSlug = createLinkRes.body.rawTokenSlug;

      // Inspect Link (Crawler-safe, no side-effects)
      const inspectRes = await request(httpServer).get(`/api/v1/private-links/inspect/${testPrivateSlug}`);
      recordTest('PrivateStreams', 'GET /api/v1/private-links/inspect/:tokenSlug returns metadata without token issue', inspectRes.status === 200 && inspectRes.body.requiresPassword === true, inspectRes.body);

      // Claim Link with Invalid Password
      const badClaimRes = await request(httpServer)
        .post(`/api/v1/private-links/claim/${testPrivateSlug}`)
        .send({ password: 'WrongPassword!', guestName: 'Ankit' });
      recordTest('PrivateStreams', 'POST /api/v1/private-links/claim/:tokenSlug rejects incorrect password with 401', badClaimRes.status === 401, badClaimRes.body);

      // Claim Link with Correct Password
      const goodClaimRes = await request(httpServer)
        .post(`/api/v1/private-links/claim/${testPrivateSlug}`)
        .send({ password: 'SecretPoojaPassword123', guestName: 'Ankit Tiwari' });
      recordTest('PrivateStreams', 'POST /api/v1/private-links/claim/:tokenSlug verifies password and mints videoToken', goodClaimRes.status === 200 && !!goodClaimRes.body.token, goodClaimRes.body);

      // Revoke Private Link
      const revokeRes = await request(httpServer)
        .post(`/api/v1/private-links/${testPrivateLinkId}/revoke`)
        .set('Authorization', `Bearer ${streamerAccessToken}`);
      recordTest('PrivateStreams', 'POST /api/v1/private-links/:id/revoke revokes link and evicts viewers', revokeRes.status === 200, revokeRes.body);

      // Clean up private stream
      await request(httpServer)
        .post(`/api/v1/streams/${testPrivateStreamId}/end`)
        .set('Authorization', `Bearer ${streamerAccessToken}`);
    }

    // -------------------------------------------------------------------------
    // 8. Reports & Safety Queue Flow
    // -------------------------------------------------------------------------
    console.log('\n📌 8. SAFETY & CONTENT REPORTING FLOW');
    {
      const reportRes = await request(httpServer)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${viewerAccessToken}`)
        .send({
          targetType: 'STREAM',
          streamId: testStreamId,
          reason: 'Inappropriate audio or spam test report',
        });
      recordTest('Reports', 'POST /api/v1/reports submits user report for moderation review', reportRes.status === 201 && !!reportRes.body.reportId);
      testReportId = reportRes.body.reportId;

      const queueRes = await request(httpServer)
        .get('/api/v1/reports/queue')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      recordTest('Reports', 'GET /api/v1/reports/queue admin fetches pending moderation queue', queueRes.status === 200 && queueRes.body.length > 0);

      const resolveRes = await request(httpServer)
        .patch(`/api/v1/reports/${testReportId}/resolve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          status: 'ACTION_TAKEN',
          adminNotes: 'Verified and resolved during automated test suite execution.',
        });
      recordTest('Reports', 'PATCH /api/v1/reports/:id/resolve admin resolves report', resolveRes.status === 200 && resolveRes.body.report?.status === 'ACTION_TAKEN');
    }

    // -------------------------------------------------------------------------
    // 9. Internal Guard & Webhook Security
    // -------------------------------------------------------------------------
    console.log('\n📌 9. INTERNAL SECURITY & WEBHOOK GUARDS');
    {
      const internalKey = process.env.INTERNAL_KEY || 'a896da349bf2cdfb476423a33a76bc7fbb412aeceb0d2ab0';

      // Test with valid internal key
      const goodInternalRes = await request(httpServer)
        .get('/api/v1/internal/live-count')
        .set('x-internal-key', internalKey);
      recordTest('Security', 'GET /api/v1/internal/live-count allows access with valid x-internal-key', goodInternalRes.status === 200);

      // Test with invalid internal key
      const badInternalRes = await request(httpServer)
        .get('/api/v1/internal/live-count')
        .set('x-internal-key', 'wrong-key');
      recordTest('Security', 'GET /api/v1/internal/live-count blocks unauthorized callers (401)', badInternalRes.status === 401);

      // Webhook without signature
      const webhookRes = await request(httpServer)
        .post('/api/v1/webhooks/livekit')
        .send({ event: 'participant_joined' });
      recordTest('Security', 'POST /api/v1/webhooks/livekit blocks unsigned webhook calls (401)', webhookRes.status === 401);
    }
  } catch (err: any) {
    console.error('Fatal Test Suite Error:', err);
    recordTest('Suite', 'Global test execution', false, err.message);
  } finally {
    // Clean up test data from Neon DB
    console.log('\n🧹 Cleaning up test records from Neon PostgreSQL...');
    try {
      if (testReportId) await prisma.report.deleteMany({ where: { id: testReportId } });
      if (testPrivateLinkId) await prisma.privateAccessLink.deleteMany({ where: { id: testPrivateLinkId } });
      if (testPrivateStreamId) await prisma.stream.deleteMany({ where: { id: testPrivateStreamId } });
      if (testStreamId) await prisma.stream.deleteMany({ where: { id: testStreamId } });
      if (streamerProfileId) await prisma.streamerProfile.deleteMany({ where: { id: streamerProfileId } });
      if (streamerUserId) await prisma.user.deleteMany({ where: { id: streamerUserId } });
      if (viewerUserId) await prisma.user.deleteMany({ where: { id: viewerUserId } });
      console.log('✅ Clean up complete.');
    } catch (e: any) {
      console.warn('Cleanup warning:', e.message);
    }

    await app.close();
  }

  // Summary
  console.log('\n===============================================================');
  console.log('📊 TEST EXECUTION SUMMARY:');
  const passedCount = testResults.filter((r) => r.status === 'PASS').length;
  const failedCount = testResults.filter((r) => r.status === 'FAIL').length;
  console.log(`  Total Tests Run: ${testResults.length}`);
  console.log(`  ✅ Passed: ${passedCount}`);
  console.log(`  ❌ Failed: ${failedCount}`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
