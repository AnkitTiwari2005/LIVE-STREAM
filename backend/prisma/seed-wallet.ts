import { PrismaClient, WalletTxType, WalletTxCategory } from '@prisma/client';
import {
  COIN_PACKAGES_CATALOG,
  LEGACY_COIN_PACKAGE_SKUS,
} from '../src/common/config/economy.constants';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 1. Syncing Coin Packages (150 Coins = ₹100) ---');
  await prisma.coinPackage.updateMany({
    where: { sku: { in: [...LEGACY_COIN_PACKAGE_SKUS] } },
    data: { isActive: false },
  });

  for (const pkg of COIN_PACKAGES_CATALOG) {
    await prisma.coinPackage.upsert({
      where: { sku: pkg.sku },
      update: { ...pkg },
      create: { ...pkg },
    });
    console.log(`Synced package: ${pkg.name} (${pkg.sku}) - ${pkg.totalCoins} coins @ ₹${pkg.priceInr}`);
  }

  console.log('\n--- 2. Backfilling User Wallets (100 Bonus Coins) ---');
  const users = await prisma.user.findMany({
    include: { wallet: true },
  });

  for (const user of users) {
    if (!user.wallet) {
      const wallet = await prisma.userWallet.create({
        data: {
          userId: user.id,
          balanceCoins: 100,
          bonusCoins: 100,
          purchasedCoins: 0,
          lifetimeEarned: 100,
          lifetimeSpent: 0,
        },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.CREDIT,
          category: WalletTxCategory.JOINING_BONUS,
          amountCoins: 100,
          balanceBefore: 0,
          balanceAfter: 100,
          referenceId: `signup_bonus_${user.id}`,
          metadata: { note: 'Auspicious Welcome Darshan Bonus' },
        },
      });

      console.log(`Created wallet for ${user.email} (${user.name}) with 100 joining bonus coins.`);
    } else {
      console.log(`User ${user.email} already has wallet with ${user.wallet.balanceCoins} coins.`);
    }
  }

  console.log('\nSeed and backfill completed successfully! 🕉️');
}

main()
  .catch((e) => {
    console.error('Error during wallet seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
