import { PrismaClient, UserRole, UserStatus, KycStatus, StreamStatus, StreamVisibility } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🕉️ --- Syncing 7 Authentic Verified Pandits into Database --- 🕉️');

  const passwordHash = await bcrypt.hash('SanatanDharma@2026', 12);

  // 1. Fetch categories
  const poojaCat = await prisma.streamCategory.findUnique({ where: { slug: 'pooja' } });
  const aartiCat = await prisma.streamCategory.findUnique({ where: { slug: 'aarti-darshan' } });
  const kathaCat = await prisma.streamCategory.findUnique({ where: { slug: 'katha-discourse' } });
  const astroCat = await prisma.streamCategory.findUnique({ where: { slug: 'astrology-kundli' } });
  const vastuCat = await prisma.streamCategory.findUnique({ where: { slug: 'vastu' } });
  const bhajanCat = await prisma.streamCategory.findUnique({ where: { slug: 'kirtan-bhajan' } });

  const panditsData = [
    {
      slug: 'rohit-tiwari',
      name: 'पंडित रोहित तिवारी (ज्योतिषाचार्य)',
      email: 'rohit.tiwari@shubhdarshan.com',
      avatarUrl: '/images/pandits/pandit-rohit-tiwari.webp',
      bio: 'Founder of Shubhdarshan and revered Vedic astrologer based in Delhi. Specialized in Parashari Jyotish, authentic Kundli Milan, Vivah Sanskar vidhi, and auspicious matrimonial alignments.',
      specialties: ['Matrimonial Advisor', 'Kundli Milan', 'Vedic Astrology', 'Vivah Sanskar'],
      languages: ['Hindi', 'Sanskrit', 'English'],
      followerCount: 1420,
      hasSpecialBadge: true,
      specialBadgeTitle: 'संस्थापक एवं मुख्य ज्योतिषाचार्य',
      streamTitle: 'Navgrah Shanti & Vedic Kundli Remedial Pooja',
      streamDesc: 'Auspicious 9-graha oblations and personalized horoscope dosha nivaran chanting by verified Vedic scholar.',
      categoryId: astroCat?.id || poojaCat?.id,
      scheduledHoursAhead: 2,
    },
    {
      slug: 'santosh-shastri',
      name: 'पंडित संतोष कुमार शास्त्री',
      email: 'skjyotish@gmail.com', // Matching his registered email
      avatarUrl: '/images/pandits/pandit-santosh-shastri.webp',
      bio: 'Co-Founder of Shubhdarshan and master of spatial cosmic alignment (Vastu Shastra) and classical Vedic Jyotish. Expert in balancing residential and commercial energies and conducting sacred peace yagyas.',
      specialties: ['Vedic Astrology', 'Vastu Shastra', 'Kundli Milan', 'Grah Shanti'],
      languages: ['Hindi', 'Sanskrit'],
      followerCount: 1280,
      hasSpecialBadge: true,
      specialBadgeTitle: 'सह-संस्थापक एवं वास्तु रत्न',
      streamTitle: 'Vastu Purusha Pujan & Griha Shanti Hawan',
      streamDesc: 'Sacred residential and commercial energy balancing ritual invoking Vastu Purusha for peace, health, and family abundance.',
      categoryId: vastuCat?.id || poojaCat?.id,
      scheduledHoursAhead: 4,
    },
    {
      slug: 'ravi-pathak',
      name: 'पंडित रवि पाठक',
      email: 'ravi.pathak@shubhdarshan.com',
      avatarUrl: '/images/pandits/pandit-ravi-pathak.webp',
      bio: 'Dedicated Vedic Purohit specializing in classical Karmakand rituals, Ganesh Aradhana, solemn Vedic anushthans, and sacred havan sankalps.',
      specialties: ['Karmakand', 'Maha Yagya', 'Ganesh Pujan', 'Vedic Anushthan'],
      languages: ['Hindi', 'Sanskrit'],
      followerCount: 920,
      hasSpecialBadge: true,
      specialBadgeTitle: 'कर्मकाण्ड रत्न',
      streamTitle: 'Ganesh Riddhi-Siddhi Aradhana & Shanti Path',
      streamDesc: 'Vighnaharta Lord Ganesha abhishek and sacred modak naivedyam with Shukla Yajurveda Swasti Vachan.',
      categoryId: poojaCat?.id,
      scheduledHoursAhead: 6,
    },
    {
      slug: 'nitin-sharma',
      name: 'पंडित नितिन शर्मा',
      email: 'nitin.sharma@shubhdarshan.com',
      avatarUrl: '/images/pandits/pandit-nitin-sharma.webp',
      bio: 'Accomplished practitioner of Shukla Yajurveda rituals, renowned for rhythmic Sundarkand path recitations, Hanuman chalisa anushthans, and family shanti pujas.',
      specialties: ['Karmakand', 'Sundarkand Path', 'Hanuman Aradhana', 'Vedic Path'],
      languages: ['Hindi', 'Sanskrit'],
      followerCount: 810,
      hasSpecialBadge: true,
      specialBadgeTitle: 'सुंदरकांड रत्न',
      streamTitle: 'Sampoorna Sunderkand Path & Hanuman Chalisa Mahajaap',
      streamDesc: 'Devotional musical recitation of Sri Ramcharitmanas Sunderkand for courage, removal of obstacles, and spiritual peace.',
      categoryId: kathaCat?.id || poojaCat?.id,
      scheduledHoursAhead: 8,
    },
    {
      slug: 'umesh-shastri',
      name: 'पंडित उमेश शास्त्री',
      email: 'umesh.shastri@shubhdarshan.com',
      avatarUrl: '/images/pandits/pandit-umesh-shastri.webp',
      bio: 'Venerated Acharya of Shiva-Shakti aradhana. Conducts powerful Maha Rudrabhishek with Shukla Yajurveda mantra uccharan, Navratri Durga Saptashati, and Chandi path.',
      specialties: ['Rudrabhishek', 'Devi Pooja', 'Durga Path', 'Maha Abhishek'],
      languages: ['Hindi', 'Sanskrit'],
      followerCount: 1050,
      hasSpecialBadge: true,
      specialBadgeTitle: 'रुद्राभिषेक शिरोमणि',
      streamTitle: 'Maha Rudrabhishek & Shiva Sahasranama Aradhana',
      streamDesc: 'Sacred lingam abhishekam with Panchamrit and bilva leaves chanted live from the sacred Dashashwamedh corridor.',
      categoryId: poojaCat?.id,
      scheduledHoursAhead: 10,
    },
    {
      slug: 'kuber-tripathi',
      name: 'आचार्य कुबेर दत्त त्रिपाठी',
      email: 'kuber.tripathi@shubhdarshan.com',
      avatarUrl: '/images/pandits/acharya-kuber-tripathi.webp',
      bio: 'Scholar of Sanskrit scriptures and devotional ritual chanting. Consecrates astrological sankalp sevas, devotional bhajan aartis, and planetary remedy ceremonies.',
      specialties: ['Jyotish', 'Karmakand', 'Bhajan Sandhya', 'Sankalp Seva'],
      languages: ['Hindi', 'Sanskrit'],
      followerCount: 890,
      hasSpecialBadge: true,
      specialBadgeTitle: 'ज्योतिष कर्मकाण्ड भूषण',
      streamTitle: 'Devotional Bhajan Sandhya & Deepotsav Aarti',
      streamDesc: 'Auspicious twilight kirtan, Vedic stuti chanting, and family sankalp deepotsav.',
      categoryId: bhajanCat?.id || aartiCat?.id || poojaCat?.id,
      scheduledHoursAhead: 12,
    },
    {
      slug: 'subhash-shastri',
      name: 'पंडित सुभाष शास्त्री',
      email: 'subhash.shastri@shubhdarshan.com',
      avatarUrl: '/images/pandits/pandit-subhash-shastri.webp',
      bio: 'Expert Vedic Acharya presiding over sacred Satyanarayan Katha, Durga Saptashati recitation, Navgrah dosha shanti poojas, and auspicious home abhishekams.',
      specialties: ['Satyanarayan Pooja', 'Durga Saptashati', 'Navgrah Poojan', 'Rudrabhishek'],
      languages: ['Hindi', 'Sanskrit'],
      followerCount: 960,
      hasSpecialBadge: true,
      specialBadgeTitle: 'वैदिक विद्वान रत्न',
      streamTitle: 'Sri Satyanarayan Vrat Katha & Purnima Mahapooja',
      streamDesc: 'Sacred chapter-by-chapter recitation of Lord Satyanarayan katha with Panchamrit prasad consecration.',
      categoryId: kathaCat?.id || poojaCat?.id,
      scheduledHoursAhead: 14,
    },
  ];

  for (const p of panditsData) {
    // 1. Find or create user
    let user = await prisma.user.findUnique({ where: { email: p.email } });
    if (!user) {
      user = await prisma.user.create({
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
      console.log(`  ✨ Created Streamer User: ${user.name} <${user.email}>`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: p.name,
          role: UserRole.STREAMER,
          status: UserStatus.ACTIVE,
          avatarUrl: p.avatarUrl,
          isEmailVerified: true,
        },
      });
      console.log(`  🔄 Updated User to Streamer: ${user.name} <${user.email}>`);
    }

    // 2. Find or create streamer profile
    let profile = await prisma.streamerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.streamerProfile.create({
        data: {
          userId: user.id,
          bio: p.bio,
          specialties: p.specialties,
          languages: p.languages,
          kycStatus: KycStatus.APPROVED,
          isVerifiedBadge: true,
          hasSpecialBadge: (p as any).hasSpecialBadge ?? true,
          specialBadgeTitle: (p as any).specialBadgeTitle ?? 'आचार्य रत्न',
          followerCount: p.followerCount,
          kycReviewedAt: new Date(),
        },
      });
      console.log(`  ⭐ Created StreamerProfile for: ${user.name}`);
    } else {
      profile = await prisma.streamerProfile.update({
        where: { id: profile.id },
        data: {
          bio: p.bio,
          specialties: p.specialties,
          languages: p.languages,
          kycStatus: KycStatus.APPROVED,
          isVerifiedBadge: true,
          hasSpecialBadge: (p as any).hasSpecialBadge ?? true,
          specialBadgeTitle: (p as any).specialBadgeTitle ?? 'आचार्य रत्न',
          followerCount: p.followerCount,
        },
      });
      console.log(`  ⭐ Updated StreamerProfile for: ${user.name}`);
    }

    // 3. Ensure wallet exists
    const existingWallet = await prisma.userWallet.findUnique({ where: { userId: user.id } });
    if (!existingWallet) {
      await prisma.userWallet.create({
        data: {
          userId: user.id,
          balanceCoins: 500,
          bonusCoins: 500,
          purchasedCoins: 0,
          lifetimeEarned: 500,
          lifetimeSpent: 0,
        },
      });
    }

    // 4. Create/update an upcoming scheduled stream
    const scheduledTime = new Date(Date.now() + p.scheduledHoursAhead * 3600 * 1000);

    // Delete any old expired scheduled streams for this streamer
    await prisma.stream.deleteMany({
      where: {
        streamerId: user.id,
        status: StreamStatus.SCHEDULED,
        scheduledAt: { lt: new Date() },
      },
    });

    // Check if an upcoming stream exists
    const upcomingStream = await prisma.stream.findFirst({
      where: {
        streamerId: user.id,
        status: { in: [StreamStatus.SCHEDULED, StreamStatus.LIVE] },
      },
    });

    if (!upcomingStream && p.categoryId) {
      await prisma.stream.create({
        data: {
          title: p.streamTitle,
          description: p.streamDesc,
          streamerId: user.id,
          categoryId: p.categoryId,
          status: StreamStatus.SCHEDULED,
          visibility: StreamVisibility.PUBLIC,
          thumbnailUrl: p.avatarUrl,
          scheduledAt: scheduledTime,
          videoQuality: '1080p',
        },
      });
      console.log(`  📅 Scheduled Stream Created: "${p.streamTitle}" at ${scheduledTime.toISOString()}`);
    }
  }

  console.log('🕉️ --- Sync Completed Successfully --- 🕉️');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
