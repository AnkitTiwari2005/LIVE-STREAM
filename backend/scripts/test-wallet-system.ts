import {
  HttpException,
  ForbiddenException,
} from '@nestjs/common';
import {
  StreamStatus,
  StreamVisibility,
  UserRole,
  ViewingSessionStatus,
  WalletTxCategory,
  StreamerEarningSource,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../src/database/prisma.service';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { ChatService } from '../src/modules/chat/chat.service';
import { StreamersService } from '../src/modules/streamers/streamers.service';
import {
  COINS_PER_MINUTE,
  calculateCoinEarningsBreakdown,
} from '../src/common/config/economy.constants';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function runWalletTestSuite() {
  console.log('=====================================================');
  console.log('🕉️ SHUBHDARSHAN COIN-ONLY ECONOMY: E2E TEST SUITE');
  console.log('=====================================================\n');

  const prisma = new PrismaService();
  await prisma.$connect();

  const emittedEarnings: Array<{ streamerId: string; payload: any }> = [];
  const emittedDakshina: Array<{ streamId: string; payload: any }> = [];
  const kickedParticipants: Array<{ streamId: string; identity: string }> = [];

  const mockLivekit: any = {
    kickParticipant: async (streamId: string, identity: string) => {
      kickedParticipants.push({ streamId, identity });
    },
  };

  const mockGateway: any = {
    emitEarningsUpdated: (streamerId: string, payload: any) => {
      emittedEarnings.push({ streamerId, payload });
    },
    broadcastDakshina: (streamId: string, payload: any) => {
      emittedDakshina.push({ streamId, payload });
    },
  };

  const chatService = new ChatService(prisma);
  const walletService = new WalletService(prisma, mockLivekit, mockGateway);
  const paymentsService = new PaymentsService(
    prisma,
    mockGateway,
    chatService,
    walletService,
  );
  const streamersService = new StreamersService(prisma);

  let devoteeId: string | null = null;
  let streamId: string | null = null;

  try {
    // 1. Register test devotee with 100 bonus coins
    console.log('--- Step 1: Testing Devotee Registration & 100 Bonus Coins ---');
    const testEmail = `devotee_wallet_test_${Date.now()}@shubhdarshan.com`;
    const passwordHash = await bcrypt.hash('SecurePooja2026!', 10);

    const newDevotee = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        name: 'Rohan Verma',
        role: UserRole.VIEWER,
        status: 'ACTIVE',
        isEmailVerified: true,
        wallet: {
          create: {
            balanceCoins: 100,
            bonusCoins: 100,
            purchasedCoins: 0,
            lifetimeEarned: 100,
            lifetimeSpent: 0,
            transactions: {
              create: {
                type: 'CREDIT',
                category: WalletTxCategory.JOINING_BONUS,
                amountCoins: 100,
                balanceBefore: 0,
                balanceAfter: 100,
                referenceId: `signup_bonus_${testEmail}`,
                metadata: { note: 'Auspicious Welcome Darshan Bonus' },
              },
            },
          },
        },
      },
      include: { wallet: true },
    });
    devoteeId = newDevotee.id;
    assert(newDevotee.wallet?.balanceCoins === 100, 'Expected initial wallet balance 100');
    console.log(`✅ Devotee registered (${testEmail}) with 100 Bonus Coins\n`);

    // 2. Locate Pandit & create temporary LIVE PUBLIC stream
    console.log('--- Step 2: Pandit Creates Temporary Public Live Stream ---');
    const pandit =
      (await prisma.user.findFirst({
        where: { email: 'pandit.aarav@shubhdarshan.com', role: UserRole.STREAMER },
      })) ||
      (await prisma.user.findFirst({
        where: { role: UserRole.STREAMER },
      }));
    if (!pandit) throw new Error('FAIL: No STREAMER/Pandit account found in DB');

    const category = await prisma.streamCategory.findFirst();
    if (!category) throw new Error('FAIL: No StreamCategory found in DB');

    const stream = await prisma.stream.create({
      data: {
        streamerId: pandit.id,
        categoryId: category.id,
        title: `E2E Coin Economy Test Stream ${Date.now()}`,
        visibility: StreamVisibility.PUBLIC,
        status: StreamStatus.LIVE,
        startedAt: new Date(),
      },
    });
    streamId = stream.id;
    console.log(`✅ Live stream created (${stream.id}) for ${pandit.name}\n`);

    // 3. Upfront Minute 1 metering + StreamerEarning creation
    console.log('--- Step 3: Upfront Minute 1 Metering + WATCH_TIME StreamerEarning ---');
    const joinRes = await walletService.startViewingSession(newDevotee.id, stream.id);
    assert(
      joinRes.remainingCoins === 100 - COINS_PER_MINUTE,
      `Expected ${100 - COINS_PER_MINUTE} coins, got ${joinRes.remainingCoins}`,
    );

    const sessionAfterJoin = await prisma.streamViewingSession.findUnique({
      where: { sessionToken: joinRes.sessionToken },
    });
    if (!sessionAfterJoin) throw new Error('FAIL: Viewing session not created');

    const earningsMin1 = await prisma.streamerEarning.findMany({
      where: { streamId: stream.id },
    });
    assert(earningsMin1.length === 1, `Expected 1 StreamerEarning row, found ${earningsMin1.length}`);
    assert(
      earningsMin1[0].source === StreamerEarningSource.WATCH_TIME &&
        earningsMin1[0].coins === COINS_PER_MINUTE &&
        earningsMin1[0].idempotencyKey === `earn_${sessionAfterJoin.id}_1`,
      'Minute 1 StreamerEarning fields mismatch',
    );
    assert(
      emittedEarnings.length === 1 &&
        emittedEarnings[0].streamerId === pandit.id &&
        emittedEarnings[0].payload.totalCoins === COINS_PER_MINUTE &&
        emittedEarnings[0].payload.delta === COINS_PER_MINUTE,
      'Minute 1 stream:earnings_updated event mismatch',
    );
    console.log('✅ Minute 1 debited 5 coins and credited StreamerEarning + emitted private event\n');

    // 4. Reconnect reuse & <55s cooldown must NOT double credit
    console.log('--- Step 4: Reconnect Reuse & Cooldown Guard ---');
    const reconnectRes = await walletService.startViewingSession(newDevotee.id, stream.id);
    assert(
      reconnectRes.remainingCoins === 95 && reconnectRes.sessionToken === joinRes.sessionToken,
      'Reconnect must reuse active session without charging',
    );
    const cooldownTick = await walletService.processMeterTick(newDevotee.id, {
      streamId: stream.id,
      sessionToken: reconnectRes.sessionToken,
    });
    assert(
      cooldownTick.canContinue && cooldownTick.remainingCoins === 95,
      'Cooldown tick should keep remainingCoins at 95',
    );
    const earningsAfterGuard = await prisma.streamerEarning.count({ where: { streamId: stream.id } });
    assert(earningsAfterGuard === 1, `Guards failed: expected 1 earning row, got ${earningsAfterGuard}`);
    assert(emittedEarnings.length === 1, 'Guards should not emit extra earnings events');
    console.log('✅ Reconnect reuse and 55s cooldown guard prevented double-credit\n');

    // 5. Minute 2 heartbeat tick after 65s elapsed
    console.log('--- Step 5: Minute 2 Meter Tick + WATCH_TIME StreamerEarning ---');
    await prisma.streamViewingSession.update({
      where: { id: sessionAfterJoin.id },
      data: { lastTickAt: new Date(Date.now() - 65_000) },
    });
    const min2Tick = await walletService.processMeterTick(newDevotee.id, {
      streamId: stream.id,
      sessionToken: joinRes.sessionToken,
    });
    assert(
      min2Tick.canContinue && min2Tick.minutesWatched === 2 && min2Tick.remainingCoins === 90,
      `Minute 2 tick failed: ${JSON.stringify(min2Tick)}`,
    );
    const earningsMin2 = await prisma.streamerEarning.findMany({
      where: { streamId: stream.id },
      orderBy: { createdAt: 'asc' },
    });
    assert(earningsMin2.length === 2, 'Expected 2 StreamerEarning rows after minute 2');
    assert(
      earningsMin2[1].idempotencyKey === `earn_${sessionAfterJoin.id}_2` &&
        emittedEarnings.length === 2 &&
        emittedEarnings[1].payload.totalCoins === 10,
      'Minute 2 StreamerEarning / realtime emission mismatch',
    );
    console.log('✅ Minute 2 credited 5 coins (stream total 10 coins)\n');

    // 6. Verify 150 coins = ₹100 coin packages & simulate top-up
    console.log('--- Step 6: Verify Coin Packages (shubh_150 @ ₹100) ---');
    const pkg = await prisma.coinPackage.findUnique({ where: { sku: 'shubh_150' } });
    if (
      !pkg ||
      !pkg.isActive ||
      pkg.coins !== 150 ||
      pkg.bonusCoins !== 0 ||
      Number(pkg.priceInr) !== 100
    ) {
      throw new Error('FAIL: Expected active shubh_150 package (150 coins @ ₹100)');
    }
    const legacyPkg = await prisma.coinPackage.findUnique({ where: { sku: 'shubh_100' } });
    assert(!legacyPkg || !legacyPkg.isActive, 'Legacy shubh_100 package must be inactive');

    const topupOrder = await prisma.walletTopupOrder.create({
      data: {
        userId: newDevotee.id,
        packageId: pkg.id,
        coinsToCredit: 150,
        amountInr: 100.0,
        orderId: `order_test_${Date.now()}`,
        paymentId: `pay_test_${Date.now()}`,
        status: 'SUCCESS',
      },
    });
    const toppedWallet = await prisma.userWallet.update({
      where: { userId: newDevotee.id },
      data: {
        balanceCoins: { increment: 150 },
        purchasedCoins: { increment: 150 },
        lifetimeEarned: { increment: 150 },
      },
    });
    await prisma.walletTransaction.create({
      data: {
        walletId: toppedWallet.id,
        type: 'CREDIT',
        category: WalletTxCategory.TOPUP_PURCHASE,
        amountCoins: 150,
        balanceBefore: 90,
        balanceAfter: toppedWallet.balanceCoins,
        referenceId: topupOrder.orderId,
        idempotencyKey: `pay_${topupOrder.paymentId}`,
      },
    });
    assert(toppedWallet.balanceCoins === 240, `Expected 240 coins after top-up, got ${toppedWallet.balanceCoins}`);
    console.log('✅ Verified shubh_150 package & top-up (new balance: 240 Coins)\n');

    // 7. Coin-only Dakshina + idempotency + self-tip rejection + 402 check
    console.log('--- Step 7: Coin-Only Dakshina, Idempotency, Self-Tip & 402 Checks ---');
    const dakshinaKey = `dak_e2e_${Date.now()}`;
    const dakshinaRes = await paymentsService.sendCoinDakshina(
      {
        streamId: stream.id,
        coins: 51,
        devoteeName: 'Rohan',
        prayerMessage: 'Har Har Mahadev',
        idempotencyKey: dakshinaKey,
      },
      newDevotee.id,
    );
    assert(
      dakshinaRes.offering.coins === 51 && dakshinaRes.remainingCoins === 189,
      `Expected Dakshina 51 & balance 189, got ${JSON.stringify(dakshinaRes)}`,
    );

    // Retry with same idempotencyKey -> must NOT double-debit
    const retryRes = await paymentsService.sendCoinDakshina(
      {
        streamId: stream.id,
        coins: 51,
        devoteeName: 'Rohan',
        idempotencyKey: dakshinaKey,
      },
      newDevotee.id,
    );
    assert(
      retryRes.idempotentReplay === true && retryRes.remainingCoins === 189,
      'Idempotent retry failed',
    );

    // Self-tip rejection
    let selfTipRejected = false;
    try {
      await paymentsService.sendCoinDakshina(
        {
          streamId: stream.id,
          coins: 21,
          devoteeName: pandit.name,
          idempotencyKey: `self_${Date.now()}`,
        },
        pandit.id,
      );
    } catch (err) {
      if (err instanceof ForbiddenException) selfTipRejected = true;
    }
    assert(selfTipRejected, 'Pandit was allowed to send Dakshina to own stream');

    // Insufficient coins -> 402 INSUFFICIENT_COINS
    let lowBalance402 = false;
    try {
      await paymentsService.sendCoinDakshina(
        {
          streamId: stream.id,
          coins: 500,
          devoteeName: 'Rohan',
          idempotencyKey: `low_${Date.now()}`,
        },
        newDevotee.id,
      );
    } catch (err: any) {
      if (err instanceof HttpException && err.getStatus() === 402) {
        lowBalance402 = true;
      }
    }
    assert(lowBalance402, 'Expected HTTP 402 INSUFFICIENT_COINS when coins > balance');
    assert(
      emittedEarnings.length === 3 &&
        emittedEarnings[2].payload.totalCoins === 61 &&
        emittedEarnings[2].payload.source === StreamerEarningSource.DAKSHINA &&
        emittedDakshina.length === 1 &&
        emittedDakshina[0].payload.coins === 51,
      'Dakshina realtime events mismatch',
    );
    console.log('✅ Coin Dakshina debited 51 coins, enforced idempotency, blocked self-tip, returned 402 on low balance\n');

    // 8. Verify StreamersService per-stream earnings breakdown (150 coins = ₹100, 85% share)
    console.log('--- Step 8: Verify Streamer Earnings INR Math (150 coins = ₹100, 85%) ---');
    const summary = await streamersService.getStreamEarnings(
      stream.id,
      pandit.id,
      UserRole.STREAMER,
    );
    const expected = calculateCoinEarningsBreakdown(61);
    assert(
      summary.totalCoins === 61 &&
        summary.watchTimeCoins === 10 &&
        summary.dakshinaCoins === 51 &&
        summary.grossInr === expected.grossInr &&
        summary.netInr === expected.netInr,
      `Per-stream earnings mismatch: ${JSON.stringify(summary)}`,
    );
    console.log(
      `✅ Per-stream summary: ${summary.totalCoins} Coins (Watch ${summary.watchTimeCoins} + Dakshina ${summary.dakshinaCoins}) = ₹${summary.grossInr} gross / ₹${summary.netInr} net\n`,
    );

    // 9. Zero-balance eviction must NOT create StreamerEarning
    console.log('--- Step 9: Zero-Balance Eviction Guard (No Negative Balance / No Earning) ---');
    await prisma.userWallet.update({
      where: { userId: newDevotee.id },
      data: { balanceCoins: 3 },
    });
    await prisma.streamViewingSession.update({
      where: { id: sessionAfterJoin.id },
      data: { lastTickAt: new Date(Date.now() - 65_000) },
    });
    const evictedTick = await walletService.processMeterTick(newDevotee.id, {
      streamId: stream.id,
      sessionToken: joinRes.sessionToken,
    });
    assert(
      evictedTick.canContinue === false && evictedTick.reason === 'ZERO_BALANCE',
      'Expected ZERO_BALANCE eviction response',
    );
    const walletEnd = await prisma.userWallet.findUnique({ where: { userId: newDevotee.id } });
    const sessionEnd = await prisma.streamViewingSession.findUnique({ where: { id: sessionAfterJoin.id } });
    const totalEarningsRows = await prisma.streamerEarning.count({ where: { streamId: stream.id } });
    assert(walletEnd?.balanceCoins === 3, 'Wallet balance mutated during failed tick');
    assert(sessionEnd?.status === ViewingSessionStatus.EVICTED_ZERO_BALANCE, 'Session status not evicted');
    assert(totalEarningsRows === 3, `Expected 3 StreamerEarning rows total, got ${totalEarningsRows}`);
    assert(kickedParticipants.length === 1, 'Expected LiveKit kickParticipant call on eviction');
    console.log('✅ Evicted low-balance viewer cleanly without crediting StreamerEarning\n');

    console.log('=====================================================');
    console.log('🎉 ALL 9 COIN-ONLY ECONOMY & EARNINGS E2E CHECKS PASSED!');
    console.log('=====================================================');
  } finally {
    try {
      if (streamId) {
        await prisma.streamerEarning.deleteMany({ where: { streamId } });
        await prisma.dakshinaOffering.deleteMany({ where: { streamId } });
        await prisma.meterTickLog.deleteMany({ where: { session: { streamId } } });
        await prisma.walletTransaction.deleteMany({ where: { streamId } });
        await prisma.streamViewingSession.deleteMany({ where: { streamId } });
        await prisma.stream.delete({ where: { id: streamId } });
      }
      if (devoteeId) {
        await prisma.walletTransaction.deleteMany({ where: { wallet: { userId: devoteeId } } });
        await prisma.walletTopupOrder.deleteMany({ where: { userId: devoteeId } });
        await prisma.userWallet.deleteMany({ where: { userId: devoteeId } });
        await prisma.user.delete({ where: { id: devoteeId } });
      }
    } catch (cleanupErr) {
      console.error('Cleanup warning:', cleanupErr);
    }
    await prisma.$disconnect();
  }
}

runWalletTestSuite().catch((e) => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
