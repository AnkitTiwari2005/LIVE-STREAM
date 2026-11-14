import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '../src/modules/notifications/mailer.service';
import { StorageService } from '../src/modules/storage/storage.service';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- Testing DPDP Account Erasure Flow ---');
  const jwtService = new JwtService({ secret: 'test_jwt_secret_for_tests' });
  const mailerService = new MailerService();
  const storageService = new StorageService();

  const authService = new AuthService(
    prisma as any,
    jwtService,
    mailerService,
    storageService,
    null as any, // streamsService
    null as any, // throttler
  );

  const testEmail = `dpdp_test_${Date.now()}@example.com`;
  const rawPassword = 'Password123!Secure';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Create a devotee user with wallet
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'Test Devotee Erasure',
      passwordHash,
      role: UserRole.VIEWER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      wallet: {
        create: {
          balanceCoins: 50,
          bonusCoins: 50,
          purchasedCoins: 0,
        },
      },
    },
    include: { wallet: true },
  });

  console.log(`Created test devotee: ${user.id} (${user.email})`);

  // 2. Test missing password -> must throw BadRequestException
  try {
    await authService.deleteAccount(user.id, '');
    console.error('❌ FAIL: deleteAccount should have thrown on missing password');
    process.exit(1);
  } catch (err: any) {
    console.log('✅ PASS: Caught missing password error:', err.message);
  }

  // 3. Test wrong password -> must throw UnauthorizedException
  try {
    await authService.deleteAccount(user.id, 'WrongPassword123!');
    console.error('❌ FAIL: deleteAccount should have thrown on wrong password');
    process.exit(1);
  } catch (err: any) {
    console.log('✅ PASS: Caught wrong password error:', err.message);
  }

  // 4. Test correct password -> must succeed and scrub data
  const result = await authService.deleteAccount(user.id, rawPassword);
  console.log('✅ PASS: deleteAccount succeeded with response:', result.message);

  // 5. Verify database state
  const deletedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { wallet: true },
  });

  if (!deletedUser) {
    console.error('❌ FAIL: user record not found');
    process.exit(1);
  }

  if (deletedUser.name !== 'Deleted Devotee') {
    console.error('❌ FAIL: user name not anonymized:', deletedUser.name);
    process.exit(1);
  }

  if (!deletedUser.email.startsWith('deleted_')) {
    console.error('❌ FAIL: user email not anonymized:', deletedUser.email);
    process.exit(1);
  }

  if (deletedUser.passwordHash !== null) {
    console.error('❌ FAIL: passwordHash not nulled');
    process.exit(1);
  }

  if (deletedUser.status !== UserStatus.DELETION_REQUESTED) {
    console.error('❌ FAIL: status not DELETION_REQUESTED:', deletedUser.status);
    process.exit(1);
  }

  if (deletedUser.wallet && deletedUser.wallet.balanceCoins !== 0) {
    console.error('❌ FAIL: wallet coins not zeroed out:', deletedUser.wallet.balanceCoins);
    process.exit(1);
  }

  // 6. Verify DPDP audit log
  const auditLog = await prisma.auditLog.findFirst({
    where: {
      action: 'DPDP_USER_ACCOUNT_DELETED',
      targetResource: `User:${user.id}`,
    },
  });

  if (!auditLog) {
    console.error('❌ FAIL: DPDP audit log entry not found');
    process.exit(1);
  }

  if (auditLog.actorEmail !== '[DPDP_REDACTED]') {
    console.error('❌ FAIL: actorEmail not redacted in audit log');
    process.exit(1);
  }

  console.log('✅ ALL DPDP ACCOUNT ERASURE CHECKS PASSED PERFECTLY!');

  // Cleanup test user from DB
  await prisma.userWallet.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.deleteMany({ where: { targetResource: `User:${user.id}` } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Cleaned up test record.');
}

runTest()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
