import { PrismaClient } from '@prisma/client';
import { AdminService } from '../src/modules/admin/admin.service';

async function runTestSuite() {
  console.log('--- Starting Admin Panel Enhancement Test Suite ---');
  const prisma = new PrismaClient();
  const mockVideoProvider: any = { endRoom: async () => true };
  const mockChatService: any = { reloadWordFilter: async () => true };

  const adminService = new AdminService(
    prisma as any,
    mockVideoProvider,
    mockChatService,
  );

  let passed = 0;
  let failed = 0;

  // Test 1: Category retrieval
  try {
    const categories = await adminService.getCategories();
    console.log(`[PASS] Test 1: getCategories returned ${categories.length} categories.`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] Test 1: getCategories threw: ${err.message}`);
    failed++;
  }

  // Test 2: Category CRUD cycle
  const testSlug = `temp-test-category-${Date.now()}`;
  let createdCatId = '';
  try {
    const created = await adminService.createCategory('Temporary Test Category', testSlug, 999);
    createdCatId = created.id;
    console.log(`[PASS] Test 2a: createCategory succeeded (ID: ${created.id}).`);

    const updated = await adminService.updateCategory(created.id, 'Temporary Test Category Updated', 1000, false);
    if (updated.isActive === false && updated.name === 'Temporary Test Category Updated') {
      console.log(`[PASS] Test 2b: updateCategory succeeded.`);
    } else {
      throw new Error('updateCategory returned unexpected state');
    }

    await adminService.deleteCategory(created.id);
    console.log(`[PASS] Test 2c: deleteCategory succeeded.`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] Test 2: Category CRUD threw: ${err.message}`);
    failed++;
    // Cleanup if needed
    if (createdCatId) {
      await prisma.streamCategory.deleteMany({ where: { id: createdCatId } }).catch(() => {});
    }
  }

  // Test 3: Pooja Bookings Oversight
  try {
    const bookings = await adminService.getPoojaBookings('ALL', 1, 10);
    console.log(`[PASS] Test 3: getPoojaBookings returned ${bookings.data.length} records (Total: ${bookings.total}).`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] Test 3: getPoojaBookings threw: ${err.message}`);
    failed++;
  }

  // Test 4: Pandit Dakshina Payout Ledger
  try {
    const ledgerData = await adminService.getDakshinaLedger();
    console.log(`[PASS] Test 4: getDakshinaLedger returned ${ledgerData.ledger.length} pandits, Platform Total Coins: ${ledgerData.platformTotalCoins}, INR: ₹${ledgerData.platformTotalInr}.`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] Test 4: getDakshinaLedger threw: ${err.message}`);
    failed++;
  }

  // Test 5: Users auto-load query without filter
  try {
    const users = await adminService.searchUsers();
    console.log(`[PASS] Test 5: searchUsers without filter returned ${users.length} users for auto-load.`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] Test 5: searchUsers threw: ${err.message}`);
    failed++;
  }

  // Test 6: Audit logs
  try {
    const logs = await adminService.getAuditLogs(10);
    console.log(`[PASS] Test 6: getAuditLogs returned ${logs.length} entries.`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] Test 6: getAuditLogs threw: ${err.message}`);
    failed++;
  }

  await prisma.$disconnect();

  console.log(`\n--- Test Suite Summary: ${passed} Passed, ${failed} Failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
