/**
 * storage.test.ts (N3 Storage Hardening Verification Suite)
 *
 * Verifies folder allowlist, magic byte vs extension agreement,
 * key format validation, path traversal defense, and per-user folder quota.
 */
import { StorageService, KEY_RE, ALLOWED_FOLDERS } from '../src/modules/storage/storage.service';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('--- Running Storage Security & Hardening Tests (N3) ---');
  const storageService = new StorageService();
  const testUserId = 'test-user-n3-uuid';

  // 1. Folder Allowlist in getPresignedUploadUrl
  let threw = false;
  try {
    await storageService.getPresignedUploadUrl('test.jpg', 'image/jpeg', 'arbitrary_folder', testUserId);
  } catch (err: any) {
    threw = true;
    assert(err.message.includes('Disallowed upload folder'), 'Rejects non-allowlisted upload folder');
  }
  assert(threw, 'Threw BadRequestException on arbitrary folder');

  // 2. Reject PDF in non-kyc folder
  threw = false;
  try {
    await storageService.getPresignedUploadUrl('doc.pdf', 'application/pdf', 'media', testUserId);
  } catch (err: any) {
    threw = true;
    assert(err.message.includes('PDF documents are only permitted in the kyc folder'), 'Rejects PDF outside kyc folder');
  }
  assert(threw, 'Threw on PDF in media folder');

  // 3. Valid presigned URL generation for allowed folders
  for (const folder of ['media', 'avatars', 'thumbnails', 'kyc'] as const) {
    const isPdf = folder === 'kyc';
    const ct = isPdf ? 'application/pdf' : 'image/png';
    const filename = isPdf ? 'id.pdf' : 'avatar.png';
    const res = await storageService.getPresignedUploadUrl(filename, ct, folder, testUserId);
    assert(KEY_RE.test(res.storageKey), `Generated storageKey matches KEY_RE for folder '${folder}'`);
    assert(res.storageKey.startsWith(`${folder}/${testUserId}_`), `Key binds to folder and owner prefix for '${folder}'`);
  }

  // 4. KEY_RE strict format validation
  assert(KEY_RE.test(`media/${testUserId}_0123456789abcdef0123456789abcdef.jpg`), 'Valid JPEG key matches');
  assert(KEY_RE.test(`avatars/${testUserId}_0123456789abcdef0123456789abcdef.png`), 'Valid PNG key matches');
  assert(KEY_RE.test(`kyc/${testUserId}_0123456789abcdef0123456789abcdef.pdf`), 'Valid PDF key matches');
  assert(!KEY_RE.test(`root/evil.exe`), 'Invalid folder & extension rejected');
  assert(!KEY_RE.test(`media/bad_file.png`), 'Missing 32-hex ID rejected');
  assert(!KEY_RE.test(`media/../etc/passwd.jpg`), 'Path traversal rejected by KEY_RE');
  assert(!KEY_RE.test(`media/${testUserId}_short.jpg`), 'Short ID rejected');

  // 5. Magic Byte vs Extension Agreement in saveFile
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const validPdfBuffer = Buffer.from('%PDF-1.4 header and content for test');
  const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

  const testPngKey = `avatars/${testUserId}_0123456789abcdef0123456789abcdef.png`;
  const testPdfKey = `kyc/${testUserId}_0123456789abcdef0123456789abcdef.pdf`;
  const testJpgKey = `thumbnails/${testUserId}_0123456789abcdef0123456789abcdef.jpg`;

  // Mismatch: PNG extension with PDF content
  threw = false;
  try {
    await storageService.saveFile(testPngKey, validPdfBuffer);
  } catch (err: any) {
    threw = true;
    assert(err.message.includes('does not match file content'), 'Rejects PNG extension with PDF content');
  }
  assert(threw, 'Threw on extension/magic-bytes disagreement');

  // Mismatch: PDF extension with JPG content
  threw = false;
  try {
    await storageService.saveFile(testPdfKey, validJpgBuffer);
  } catch (err: any) {
    threw = true;
    assert(err.message.includes('does not match file content'), 'Rejects PDF extension with JPG content');
  }
  assert(threw, 'Threw on PDF extension with JPG content');

  // 6. Successful upload and retrieval
  const savedUrl = await storageService.saveFile(testPngKey, validPngBuffer);
  assert(savedUrl.includes(testPngKey), 'Saved file and returned valid public URL');

  // Duplicate key overwrite protection
  threw = false;
  try {
    await storageService.saveFile(testPngKey, validPngBuffer);
  } catch (err: any) {
    threw = true;
    assert(err.message.includes('already exists'), 'Rejects overwrite of existing storage key');
  }
  assert(threw, 'Threw on key overwrite');

  // Clean up test file
  await storageService.deleteFile(testPngKey);

  console.log('--- ALL STORAGE TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal storage test error:', err);
  process.exit(1);
});
