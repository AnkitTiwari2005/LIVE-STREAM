import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Seeding ---');

  // 1. Initial Categories (FR-3.3.1)
  const categories = [
    { name: 'Pooja', slug: 'pooja', displayOrder: 1 },
    { name: 'Aarti and Darshan', slug: 'aarti-darshan', displayOrder: 2 },
    { name: 'Kirtan and Bhajan', slug: 'kirtan-bhajan', displayOrder: 3 },
    { name: 'Astrology and Kundli', slug: 'astrology-kundli', displayOrder: 4 },
    { name: 'Vastu', slug: 'vastu', displayOrder: 5 },
    { name: 'Numerology', slug: 'numerology', displayOrder: 6 },
    { name: 'Katha and Discourse', slug: 'katha-discourse', displayOrder: 7 },
    { name: 'Other', slug: 'other', displayOrder: 8 },
  ];

  for (const cat of categories) {
    await prisma.streamCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, displayOrder: cat.displayOrder },
      create: { name: cat.name, slug: cat.slug, displayOrder: cat.displayOrder, isActive: true },
    });
  }
  console.log(`Seeded ${categories.length} categories.`);

  // 2. Initial Prohibited Chat Words
  const defaultBadWords = [
    'abuse', 'fraud', 'scam', 'hate', 'harass', 'vulgar', 'fake', 'cheat'
  ];
  for (const word of defaultBadWords) {
    await prisma.chatWordFilter.upsert({
      where: { word },
      update: {},
      create: { word, severity: 'HIGH', isActive: true },
    });
  }
  console.log(`Seeded ${defaultBadWords.length} initial chat filter words.`);

  // 3. Static Pages (Terms, Privacy, Refund, About, Grievance)
  const staticPages = [
    {
      slug: 'terms',
      title: 'Terms and Conditions of Service',
      contentHtml: `
        <h2>Terms of Service</h2>
        <p>Welcome to our Pooja & Astrology Live Streaming Platform.</p>
        <h3>Spiritual and Astrological Disclaimer</h3>
        <p>All Pooja ceremonies, Aarti, Darshan, and astrological advice provided on this platform are for religious, spiritual, cultural, and counseling purposes only. Astrologers, pandits, and spiritual guides broadcast as independent practitioners. The platform does not warrant, verify, or guarantee any specific material, physical, health, financial, or future life outcomes.</p>
        <h3>User Conduct & Live Stream Etiquette</h3>
        <p>Devotees and viewers must maintain sacred decorum. Harassment, abusive language in live chat, or unverified commercial solicitation will result in immediate permanent banning.</p>
      `,
    },
    {
      slug: 'privacy',
      title: 'Privacy Policy (DPDP Act, 2023 Compliant)',
      contentHtml: `
        <h2>Privacy Policy</h2>
        <p>This platform complies with the Digital Personal Data Protection Act, 2023 (DPDP Act) of India.</p>
        <h3>Data Collection & Consent</h3>
        <p>We collect only your name, email address, and profile photo for authentication and reminder delivery. By registering, you confirm you are 18 years of age or older.</p>
        <h3>Data Retention & Erasure</h3>
        <ul>
          <li>Live chat messages for concluded streams are retained for 30 days exclusively for safety and moderation audits, after which they are automatically purged.</li>
          <li>Network IP addresses in viewer logs are anonymized after 90 days.</li>
          <li>Streamer KYC proof documents are securely deleted 30 days after verification.</li>
          <li>Users may request full deletion of their personal data at any time via Account Settings.</li>
        </ul>
      `,
    },
    {
      slug: 'refund',
      title: 'Refund & Cancellation Policy',
      contentHtml: `
        <h2>Refund & Cancellation Policy</h2>
        <p>Phase 1 streams are free to attend. When paid private consultations or voluntary dakshina are introduced in Phase 2, refunds will be governed by session fulfillment and technical connectivity records.</p>
      `,
    },
    {
      slug: 'about',
      title: 'About the Platform',
      contentHtml: `
        <h2>Connecting Devotees with Verified Spiritual Guides</h2>
        <p>Our platform enables certified pandits and Vedic astrologers to perform authentic rituals and offer personal astrological guidance through high-definition, low-latency live streaming.</p>
      `,
    },
    {
      slug: 'contact',
      title: 'Contact Us',
      contentHtml: `
        <h2>Contact Information</h2>
        <p>For technical support, stream inquiries, or streamer verification assistance:</p>
        <p>Email: support@platform-domain.com</p>
      `,
    },
    {
      slug: 'grievance',
      title: 'Grievance Officer (DPDP Act)',
      contentHtml: `
        <h2>Grievance Redressal</h2>
        <p>In accordance with the Digital Personal Data Protection Act, 2023, the details of our designated Grievance Officer are:</p>
        <p><strong>Name:</strong> Grievance Redressal Officer</p>
        <p><strong>Address:</strong> Platform Operations Headquarters, New Delhi, India</p>
        <p><strong>Email:</strong> grievance@platform-domain.com</p>
        <p>Grievances will be acknowledged within 24 hours and resolved within 15 business days.</p>
      `,
    },
  ];

  for (const page of staticPages) {
    await prisma.staticPage.upsert({
      where: { slug: page.slug },
      update: { title: page.title, contentHtml: page.contentHtml },
      create: { slug: page.slug, title: page.title, contentHtml: page.contentHtml },
    });
  }
  console.log(`Seeded ${staticPages.length} CMS static pages.`);

  // 4. Default Platform Admin User (FR-A4)
  const adminEmail = 'admin@platform-domain.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('AdminPooja@2026Secure!', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Platform Operator Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isAgeConfirmed18Plus: true,
        consentRecordedAt: new Date(),
        termsVersionAccepted: 'v1.0',
      },
    });
    console.log(`Created default Administrator account: ${adminEmail}`);
  } else {
    console.log(`Admin user ${adminEmail} already exists.`);
  }

  console.log('--- Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
