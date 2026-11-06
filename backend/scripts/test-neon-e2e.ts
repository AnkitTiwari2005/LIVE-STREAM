import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

async function testNeonEndToEnd() {
  console.log('--- Testing Neon Postgres Connection and E2E Flow ---');

  // 1. Initialize NestJS App
  const app = await NestFactory.create(AppModule, { logger: false });
  const prisma = app.get(PrismaService);

  console.log('1. NestJS application successfully initialized.');

  // 2. Query Neon directly via Prisma raw query
  const rawResult = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 as result`;
  console.log(`2. Raw SQL SELECT 1 result from Neon: ${JSON.stringify(rawResult)}`);

  // 3. Query seeded categories
  const categories = await prisma.streamCategory.findMany({ select: { slug: true, name: true } });
  console.log(`3. Verified ${categories.length} categories in Neon Postgres:`);
  categories.slice(0, 3).forEach((c) => console.log(`   - ${c.slug}: ${c.name}`));

  // 4. Query seeded Admin user
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@platform-domain.com' },
    select: { email: true, role: true, isEmailVerified: true },
  });
  console.log(`4. Verified Admin in Neon Postgres: ${JSON.stringify(admin)}`);

  // 5. Query CMS static pages
  const pagesCount = await prisma.staticPage.count();
  console.log(`5. Verified ${pagesCount} CMS static pages in Neon Postgres.`);

  // 6. Test a write transaction to prove read/write capability on Neon
  const testCategory = await prisma.streamCategory.create({
    data: {
      slug: 'neon-test-temp',
      name: 'Neon E2E Test Temp',
      displayOrder: 99,
    },
  });
  console.log(`6. Successfully wrote record to Neon Postgres: id=${testCategory.id}, slug=${testCategory.slug}`);

  // Clean up test record
  await prisma.streamCategory.delete({ where: { id: testCategory.id } });
  console.log('7. Successfully deleted temporary test record from Neon.');

  await app.close();
  console.log('--- ALL NEON POSTGRES E2E TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

testNeonEndToEnd().catch((err) => {
  console.error('Neon E2E Test Failed:', err);
  process.exit(1);
});
