import { PrismaClient, UserRole, UserStatus, KycStatus, WalletTxType, WalletTxCategory, StreamStatus, StreamVisibility } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const COMMON_PASSWORD = 'Shubh@2026';

async function main() {
  console.log('🕉️ --- Starting Sacred Account Reseed & Sanitation --- 🕉️');

  // 1. Verify Admin Account
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@platform-domain.com';
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    throw new Error(`Admin account [${adminEmail}] not found! Cannot proceed without preserving admin.`);
  }

  console.log(`✅ Preserving Admin Account: ${admin.email} (${admin.id})`);

  // Ensure Admin has a wallet
  let adminWallet = await prisma.userWallet.findUnique({ where: { userId: admin.id } });
  if (!adminWallet) {
    adminWallet = await prisma.userWallet.create({
      data: {
        userId: admin.id,
        balanceCoins: 1000,
        bonusCoins: 1000,
        purchasedCoins: 0,
        lifetimeEarned: 1000,
        lifetimeSpent: 0,
      },
    });
    await prisma.walletTransaction.create({
      data: {
        walletId: adminWallet.id,
        type: WalletTxType.CREDIT,
        category: WalletTxCategory.ADMIN_ADJUSTMENT,
        amountCoins: 1000,
        balanceBefore: 0,
        balanceAfter: 1000,
        referenceId: `admin_init_${admin.id}`,
        idempotencyKey: `admin_init_${admin.id}`,
        metadata: { note: 'Admin Platform Sovereign Balance' },
      },
    });
    console.log('✅ Initialized Admin Wallet.');
  }

  // 2. Clean Up Dependent Data for all Non-Admin Users
  console.log('🧹 Purging old test streams, transactions, reports, and non-admin users...');

  // Delete all reports
  await prisma.report.deleteMany({});
  console.log('  - Cleared reports');

  // Delete moderation actions
  await prisma.moderationAction.deleteMany({});
  console.log('  - Cleared moderation actions');

  // Delete chat messages
  await prisma.chatMessage.deleteMany({});
  console.log('  - Cleared chat messages');

  // Delete viewer sessions and blocked viewers
  await prisma.viewerSession.deleteMany({});
  await prisma.blockedViewer.deleteMany({});
  console.log('  - Cleared viewer sessions and block records');

  // Delete private access links
  await prisma.privateAccessLink.deleteMany({});
  console.log('  - Cleared private access links');

  // Delete dakshina offerings
  await prisma.dakshinaOffering.deleteMany({});
  console.log('  - Cleared dakshina offerings');

  // Delete stream reminders
  await prisma.streamReminder.deleteMany({});
  console.log('  - Cleared stream reminders');

  // Delete meter tick logs and viewing sessions
  await prisma.meterTickLog.deleteMany({});
  await prisma.streamViewingSession.deleteMany({});
  console.log('  - Cleared viewing sessions & meter ticks');

  // Delete streams
  await prisma.stream.deleteMany({});
  console.log('  - Cleared old streams');

  // Delete follows
  await prisma.follow.deleteMany({});
  console.log('  - Cleared follows');

  // Delete topup orders for non-admins
  await prisma.walletTopupOrder.deleteMany({
    where: { userId: { not: admin.id } },
  });
  console.log('  - Cleared old topup orders');

  // Delete wallet transactions for non-admins
  await prisma.walletTransaction.deleteMany({
    where: { wallet: { userId: { not: admin.id } } },
  });

  // Delete user wallets for non-admins
  await prisma.userWallet.deleteMany({
    where: { userId: { not: admin.id } },
  });
  console.log('  - Cleared old user wallets & ledger history');

  // Delete streamer profiles for non-admins
  await prisma.streamerProfile.deleteMany({
    where: { userId: { not: admin.id } },
  });
  console.log('  - Cleared old streamer profiles');

  // Delete all non-admin users
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { not: admin.id } },
  });
  console.log(`✅ Deleted ${deletedUsers.count} non-admin user accounts.`);

  // 3. Prepare Common Password Hash
  const passwordHash = await bcrypt.hash(COMMON_PASSWORD, 12);

  // 4. Create 2 Viewer / Devotee Accounts (with 100 coins each)
  console.log('\n--- 3. Creating Sacred Viewer/Devotee Accounts (100 Coins Each) ---');

  const devotees = [
    {
      name: 'Rajesh Patel',
      email: 'rajesh.patel@shubhdarshan.com',
      avatarUrl: '/images/avatar-devotee-1.webp',
    },
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@shubhdarshan.com',
      avatarUrl: '/images/avatar-devotee-2.webp',
    },
  ];

  for (const dev of devotees) {
    const user = await prisma.user.create({
      data: {
        name: dev.name,
        email: dev.email,
        passwordHash,
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isAgeConfirmed18Plus: true,
        avatarUrl: dev.avatarUrl,
        consentRecordedAt: new Date(),
        termsVersionAccepted: 'v1.0',
      },
    });

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
        idempotencyKey: `signup_bonus_${user.id}`,
        metadata: {
          note: 'Auspicious Welcome Darshan Bonus (100 Coins)',
          description: 'Sacred Devotee Consecration & Welcome Coins (100 Coins)',
        },
      },
    });

    console.log(`  ✨ Devotee Created: ${user.name} <${user.email}> (Wallet: 100 Coins)`);
  }

  // 5. Fetch Categories for Sample Broadcast Creation
  const poojaCat = await prisma.streamCategory.findUnique({ where: { slug: 'pooja' } });
  const aartiCat = await prisma.streamCategory.findUnique({ where: { slug: 'aarti-darshan' } });
  const kathaCat = await prisma.streamCategory.findUnique({ where: { slug: 'katha-discourse' } });
  const astroCat = await prisma.streamCategory.findUnique({ where: { slug: 'astrology-kundli' } });

  // 6. Create 4 Curated Gurukul-Verified Pandit Accounts
  console.log('\n--- 4. Creating 4 Gurukul-Verified Pandit Accounts ---');

  const pandits = [
    {
      name: 'Pandit Aarav Sharma',
      email: 'pandit.aarav@shubhdarshan.com',
      avatarUrl: '/images/photo-1543934776-32d1cc654abb.webp',
      bio: 'Head Archak, Kashi Vishwanath Parampara with 22 Years Seva in sacred temple rituals, Rudrabhishek, Mahamrityunjaya Jaap, and Ganga Aarti.',
      specialties: ['Rudrabhishek', 'Mahamrityunjaya Jaap', 'Ganga Aarti'],
      languages: ['Hindi', 'Sanskrit'],
      followerCount: 1420,
      streamTitle: 'Maha Rudrabhishek & Live Aarti from Kashi Vishwanath',
      streamDesc: 'Devotees are invited to participate in the sacred Rudrabhishek for peace, prosperity, and spiritual blessings broadcast directly from Varanasi.',
      category: poojaCat?.id,
      thumbnailUrl: '/images/photo-1543934776-32d1cc654abb.webp',
      status: StreamStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 2 * 3600 * 1000), // 2 hours from now
    },
    {
      name: 'Pandit Hariram Vyas',
      email: 'pandit.hariram@shubhdarshan.com',
      avatarUrl: '/images/photo-1544186196-6908a9d76ab3.webp',
      bio: 'Senior Purohit, Haridwar Ganga Sabha with 18 Years Seva in sacred Sandhya Aarti, Navgrah Shanti, and Kavach Path.',
      specialties: ['Sandhya Aarti', 'Navgrah Shanti', 'Kavach Path'],
      languages: ['Hindi', 'Sanskrit'],
      followerCount: 980,
      streamTitle: 'Maha Sandhya Aarti & Navgrah Shanti from Haridwar',
      streamDesc: 'Auspicious evening twilight aarti and planetary dosha nivaran ritual at Har Ki Pauri holy ghat.',
      category: aartiCat?.id,
      thumbnailUrl: '/images/photo-1544186196-6908a9d76ab3.webp',
      status: StreamStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 4 * 3600 * 1000), // 4 hours from now
    },
    {
      name: 'Pandit Vishwanath Bhatt',
      email: 'pandit.vishwanath@shubhdarshan.com',
      avatarUrl: '/images/photo-1596604820148-da737958af16.webp',
      bio: 'Vedic Scholar, Tirupati Devasthanam Tradition with 26 Years Seva in Vishnu Sahasranama, Satyanarayan Katha, and Vedic Chanting.',
      specialties: ['Vishnu Sahasranama', 'Satyanarayan Katha', 'Vedic Chanting'],
      languages: ['Telugu', 'Sanskrit', 'Hindi'],
      followerCount: 2140,
      streamTitle: 'Sri Vishnu Sahasranama & Satyanarayan Mahapooja',
      streamDesc: 'Sacred recitation of 1,000 holy names of Lord Mahavishnu followed by auspicious Satyanarayan Katha blessings.',
      category: kathaCat?.id,
      thumbnailUrl: '/images/photo-1596604820148-da737958af16.webp',
      status: StreamStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 6 * 3600 * 1000), // 6 hours from now
    },
    {
      name: 'Acharya Devrishi',
      email: 'acharya.devrishi@shubhdarshan.com',
      avatarUrl: '/images/photo-1762838105804-c3264c29a390.webp',
      bio: 'Sanskrit Acharya, Rishikesh Gurukul with 15 Years Seva in Vedic Astrology, Kundli Milan, and Vastu Shanti.',
      specialties: ['Vedic Astrology', 'Kundli Milan', 'Vastu Shanti'],
      languages: ['Hindi', 'Sanskrit', 'English'],
      followerCount: 810,
      streamTitle: 'Vedic Astrology & Planetary Transit Discourse',
      streamDesc: 'Deep insights into Brihat Parashara Hora Shastra, astrological remedies, and Vastu alignment from the banks of Ganga in Rishikesh.',
      category: astroCat?.id,
      thumbnailUrl: '/images/photo-1762838105804-c3264c29a390.webp',
      status: StreamStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 8 * 3600 * 1000), // 8 hours from now
    },
  ];

  for (const p of pandits) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        passwordHash,
        role: UserRole.STREAMER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isAgeConfirmed18Plus: true,
        avatarUrl: p.avatarUrl,
        consentRecordedAt: new Date(),
        termsVersionAccepted: 'v1.0',
      },
    });

    await prisma.streamerProfile.create({
      data: {
        userId: user.id,
        bio: p.bio,
        specialties: p.specialties,
        languages: p.languages,
        kycStatus: KycStatus.APPROVED,
        isVerifiedBadge: true,
        followerCount: p.followerCount,
        kycReviewedAt: new Date(),
      },
    });

    const wallet = await prisma.userWallet.create({
      data: {
        userId: user.id,
        balanceCoins: 500,
        bonusCoins: 500,
        purchasedCoins: 0,
        lifetimeEarned: 500,
        lifetimeSpent: 0,
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTxType.CREDIT,
        category: WalletTxCategory.JOINING_BONUS,
        amountCoins: 500,
        balanceBefore: 0,
        balanceAfter: 500,
        referenceId: `pandit_init_${user.id}`,
        idempotencyKey: `pandit_init_${user.id}`,
        metadata: {
          note: 'Sanctum Altar Consecration Bonus (500 Coins)',
          description: 'Pandit Consecration Bonus (500 Coins)',
        },
      },
    });

    if (p.category) {
      await prisma.stream.create({
        data: {
          streamerId: user.id,
          categoryId: p.category,
          title: p.streamTitle,
          description: p.streamDesc,
          thumbnailUrl: p.thumbnailUrl,
          visibility: StreamVisibility.PUBLIC,
          status: p.status,
          scheduledAt: p.scheduledAt,
        },
      });
    }

    console.log(`  🪔 Pandit Created: ${user.name} <${user.email}> (Streamer Profile: APPROVED)`);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL ACCOUNTS CREATED & VERIFIED SUCCESSFULLY!');
  console.log('=============================================');
  console.log(`Password for all accounts: ${COMMON_PASSWORD}`);
  console.log('Admin Account: admin@platform-domain.com');
  console.log('Devotees (100 Coins Each):');
  console.log('  1. rajesh.patel@shubhdarshan.com');
  console.log('  2. priya.sharma@shubhdarshan.com');
  console.log('Pandits (Gurukul Verified):');
  console.log('  1. pandit.aarav@shubhdarshan.com (Pandit Aarav Sharma)');
  console.log('  2. pandit.hariram@shubhdarshan.com (Pandit Hariram Vyas)');
  console.log('  3. pandit.vishwanath@shubhdarshan.com (Pandit Vishwanath Bhatt)');
  console.log('  4. acharya.devrishi@shubhdarshan.com (Acharya Devrishi)');
  console.log('=============================================');
}

main()
  .catch((e) => {
    console.error('❌ Error during reseed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
