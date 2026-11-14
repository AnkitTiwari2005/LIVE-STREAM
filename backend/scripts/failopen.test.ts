/**
 * failopen.test.ts (N1 & N6 Verification Suite)
 *
 * Verifies that unset, "Production", or "prod" NODE_ENV values fail closed,
 * and email normalization prevents Gmail dot/plus alias farming.
 */
import { isDevMode, isProductionLike } from '../src/common/runtime-mode';
import { normalizeEmail } from '../src/modules/auth/auth.service';
import { getLiveKitPublicUrl } from '../src/common/livekit-url.util';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('--- Running Fail-Open Runtime Mode & Normalization Tests (N1, N6) ---');

  // 1. Runtime Mode Matrix
  assert(isDevMode({ NODE_ENV: 'development' }), "isDevMode returns true for 'development'");
  assert(isDevMode({ NODE_ENV: 'test' }), "isDevMode returns true for 'test'");
  assert(!isDevMode({ NODE_ENV: 'production' }), "isDevMode returns false for 'production'");
  assert(!isDevMode({ NODE_ENV: 'Production' }), "isDevMode returns false for 'Production'");
  assert(!isDevMode({ NODE_ENV: 'prod' }), "isDevMode returns false for 'prod'");
  assert(!isDevMode({ NODE_ENV: '' }), 'isDevMode returns false for empty NODE_ENV');
  assert(!isDevMode({}), 'isDevMode returns false for unset NODE_ENV');

  assert(isProductionLike({}), 'isProductionLike returns true for unset NODE_ENV (fail-closed)');
  assert(isProductionLike({ NODE_ENV: 'Production' }), "isProductionLike returns true for 'Production'");
  assert(isProductionLike({ NODE_ENV: 'prod' }), "isProductionLike returns true for 'prod'");
  assert(isProductionLike({ NODE_ENV: 'staging' }), "isProductionLike returns true for 'staging'");
  assert(!isProductionLike({ NODE_ENV: 'development' }), "isProductionLike returns false for 'development'");

  // 2. Email Normalization (N6 Anti-Farming)
  assert(normalizeEmail('user.name@gmail.com') === 'username@gmail.com', 'Stripped dots in @gmail.com');
  assert(normalizeEmail('u.s.e.r.name@gmail.com') === 'username@gmail.com', 'Stripped multiple dots in @gmail.com');
  assert(normalizeEmail('username+bonus123@gmail.com') === 'username@gmail.com', 'Stripped +tag in @gmail.com');
  assert(normalizeEmail('user.name+dakshina@googlemail.com') === 'username@googlemail.com', 'Handled @googlemail.com');
  assert(normalizeEmail('Devotee.Name@CustomDomain.com') === 'devotee.name@customdomain.com', 'Preserved dots for custom domains');

  // 3. Fail-Closed LiveKit URL Guard (N1)
  const originalEnv = { ...process.env };
  try {
    delete process.env.LIVEKIT_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_LIVEKIT_URL;
    delete process.env.LIVEKIT_URL;

    // In dev mode, returns fallback
    process.env.NODE_ENV = 'development';
    assert(getLiveKitPublicUrl() === 'ws://localhost:7880', 'Dev mode returns local fallback ws://localhost:7880');

    // In production-like mode (e.g. unset or 'Production'), must throw
    process.env.NODE_ENV = 'Production';
    let threw = false;
    try {
      getLiveKitPublicUrl();
    } catch {
      threw = true;
    }
    assert(threw, "getLiveKitPublicUrl throws in 'Production' when LIVEKIT_PUBLIC_URL is unset");

    delete process.env.NODE_ENV;
    threw = false;
    try {
      getLiveKitPublicUrl();
    } catch {
      threw = true;
    }
    assert(threw, 'getLiveKitPublicUrl throws when NODE_ENV is completely unset');
  } finally {
    process.env = originalEnv;
  }

  console.log('--- ALL FAIL-OPEN & NORMALIZATION TESTS PASSED! ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
