import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import * as assert from 'assert';
import { AstroLogicsClient, AstroApiError } from '../src/modules/kundli/astrologics.client';
import { KundliService } from '../src/modules/kundli/kundli.service';
import { KundliController } from '../src/modules/kundli/kundli.controller';
import { KundliBirthDto, KundliChartDto } from '../src/modules/kundli/dto/kundli.dto';

async function runKundliTests() {
  console.log('--- Starting Kundli Feature Verification Tests ---');

  // Test 1: AstroLogicsClient.isEnabled()
  console.log('Test 1: AstroLogicsClient key detection');
  const client = new AstroLogicsClient();
  assert.strictEqual(client.isEnabled(), true, 'Client should be enabled with current ASTROLOGICS_API_KEY');

  // Test with invalid / dummy keys
  const oldKey = process.env.ASTROLOGICS_API_KEY;
  try {
    process.env.ASTROLOGICS_API_KEY = 'replace_me';
    const dummyClient = new AstroLogicsClient();
    assert.strictEqual(dummyClient.isEnabled(), false, 'Template key should not be enabled');

    process.env.ASTROLOGICS_API_KEY = 'short';
    const shortClient = new AstroLogicsClient();
    assert.strictEqual(shortClient.isEnabled(), false, 'Key shorter than 10 chars should not be enabled');
  } finally {
    process.env.ASTROLOGICS_API_KEY = oldKey;
  }
  console.log('  Passed: Client correctly validates API key presence and format.');

  // Test 2: Insecure URL rejection in production mode
  console.log('Test 2: AstroLogicsClient insecure URL rejection');
  const oldNodeEnv = process.env.NODE_ENV;
  const oldBaseUrl = process.env.ASTROLOGICS_BASE_URL;
  try {
    process.env.NODE_ENV = 'production';
    process.env.ASTROLOGICS_BASE_URL = 'http://insecure-api.astrologics.in';
    const insecureClient = new AstroLogicsClient();
    // baseUrl should fallback to https://api.astrologics.in
    assert.strictEqual((insecureClient as any).baseUrl, 'https://api.astrologics.in', 'Insecure HTTP in production must be rejected');
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    process.env.ASTROLOGICS_BASE_URL = oldBaseUrl;
  }
  console.log('  Passed: Insecure HTTP URLs are rejected in production.');

  // Test 3: KundliService input validation (Date & Time)
  console.log('Test 3: Date and time validation');
  const service = new KundliService(client);

  // Impossible calendar date (Feb 31)
  assert.throws(
    () => (service as any).buildRequest({ date: '2023-02-31', placeQuery: 'Delhi' } as KundliBirthDto),
    /real date of birth/i,
    'Should reject impossible calendar date',
  );

  // Year before 1900
  assert.throws(
    () => (service as any).buildRequest({ date: '1899-12-31', placeQuery: 'Delhi' } as KundliBirthDto),
    /between 1900 and today/i,
    'Should reject date before 1900',
  );

  // Far future date
  const futureYear = new Date().getFullYear() + 2;
  assert.throws(
    () => (service as any).buildRequest({ date: `${futureYear}-01-01`, placeQuery: 'Delhi' } as KundliBirthDto),
    /between 1900 and today/i,
    'Should reject future date',
  );

  // Missing birth time when accuracy is exact
  assert.throws(
    () => (service as any).buildRequest({ date: '2000-01-01', timeAccuracy: 'exact', placeQuery: 'Delhi' } as KundliBirthDto),
    /Birth time is required/i,
    'Should require birth time when accuracy is exact',
  );

  // Missing birth place
  assert.throws(
    () => (service as any).buildRequest({ date: '2000-01-01', time: '12:00', placeQuery: ' ' } as KundliBirthDto),
    /place of birth/i,
    'Should require birth place',
  );

  // Valid birth request with unknown time
  const reqUnknown = (service as any).buildRequest({ date: '2000-01-01', timeAccuracy: 'unknown', placeQuery: 'Varanasi' } as KundliBirthDto);
  assert.strictEqual(reqUnknown.birth.time_accuracy, 'unknown');
  assert.strictEqual(reqUnknown.birth.time, undefined, 'Time should be undefined when accuracy is unknown');

  // Valid birth request with placeId
  const reqPlaceId = (service as any).buildRequest({ date: '2000-01-01', time: '10:00', placeId: 'geoname_123' } as KundliBirthDto);
  assert.deepStrictEqual(reqPlaceId.birth.place, { place_id: 'geoname_123' });
  console.log('  Passed: All date, time, and place validation rules enforced.');

  // Test 4: SVG Security asserts (assertSafeSvg)
  console.log('Test 4: SVG Sanitization and Security Checks');
  const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>';
  assert.strictEqual((service as any).assertSafeSvg(safeSvg), safeSvg, 'Valid SVG must be accepted');

  // Malicious SVGs
  const xssCases = [
    '<svg><script>alert(1)</script></svg>',
    '<svg><foreignObject><div>xss</div></foreignObject></svg>',
    '<svg><circle onload="alert(1)" /></svg>',
    '<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>',
    '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg>&xxe;</svg>',
    'not even an svg',
  ];

  for (const malicious of xssCases) {
    assert.throws(
      () => (service as any).assertSafeSvg(malicious),
      /Chart is temporarily unavailable/i,
      `Should reject malicious SVG: ${malicious.slice(0, 30)}`,
    );
  }
  console.log('  Passed: All malicious and non-SVG inputs are rejected.');

  // Test 5: Cache Put and Get
  console.log('Test 5: In-memory Caching');
  const testKey = 'test_cache_key';
  const testData = { foo: 'bar' };
  (service as any).cachePut(testKey, testData);
  assert.deepStrictEqual((service as any).cacheGet(testKey), testData, 'Cache hit should match');
  console.log('  Passed: Cache operations verified.');

  // Test 6: Per-user Rate Limiting
  console.log('Test 6: Per-user Sliding Window Rate Limiting');
  const userBucket = 'test_user_bucket_123';
  for (let i = 0; i < 5; i++) {
    (service as any).enforceUserLimit(userBucket, 5);
  }
  // The 6th should throw 429
  assert.throws(
    () => (service as any).enforceUserLimit(userBucket, 5),
    (err: any) => err.status === 429,
    'Should throw 429 when user exceeds rate limit window',
  );
  console.log('  Passed: Per-user rate limiting correctly throttles at cap.');

  // Test 7: Controller Status
  console.log('Test 7: Controller status() endpoint');
  const controller = new KundliController(service);
  assert.deepStrictEqual(controller.status(), { enabled: true });
  console.log('  Passed: Controller status() reports enabled: true.');

  console.log('\n--- ALL 7 KUNDLI VERIFICATION CHECKS PASSED SUCCESSFULLY ---');
}

runKundliTests().catch((err) => {
  console.error('Kundli Test Failed:', err);
  process.exit(1);
});
