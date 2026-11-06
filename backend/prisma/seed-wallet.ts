import { PrismaClient, WalletTxType, WalletTxCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 1. Seeding Coin Packages ---');
  const packages = [
    {
      sku: 'shubh_100',
      name: 'Shubh Starter',
      coins: 100,
      bonusCoins: 0,
      totalCoins: 100,
      priceInr: 200.0,
      badgeText: 'Quick Darshan',
      displayOrder: 1,
      isActive: true,
    },
    {
      sku: 'bhakti_275',
      name: 'Bhakti Pack',
      coins: 250,
      bonusCoins: 25,
      totalCoins: 275,
      priceInr: 500.0,
      badgeText: '+10% Bonus',
      displayOrder: 2,
      isActive: true,
    },
    {
      sku: 'siddhi_600',
      name: 'Siddhi Pack',
      coins: 500,
      bonusCoins: 100,
      totalCoins: 600,
      priceInr: 1000.0,
      badgeText: 'Most Popular (+20% Bonus)',
      displayOrder: 3,
      isActive: true,
    },
    {
      sku: 'mahodadhi_1500',
      name: 'Mahodadhi Pack',
      coins: 1200,
      bonusCoins: 300,
      totalCoins: 1500,
      priceInr: 2100.0,
      badgeText: 'Best Value (+25% Bonus)',
      displayOrder: 4,
      isActive: true,
    },
  ];

  for (const pkg of packages) {
    await prisma.coinPackage.upsert({
      where: { sku: pkg.sku },
      update: pkg,
      create: pkg,
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
