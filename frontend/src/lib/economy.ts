export const COINS_PER_100_INR = 150;
export const STREAMER_SHARE_PERCENT = 85;
export const COINS_PER_MINUTE = 5;

export const MIN_DAKSHINA_COINS = 10;
export const MAX_DAKSHINA_COINS = 50000;

export const STARTER_PRICE_INR = 100;
export const DEFAULT_TOPUP_SKU = 'siddhi_900';

export interface CoinPackageDisplay {
  sku: string;
  name: string;
  nameHi: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  priceInr: number;
  watchMinutes: number;
  badgeText: string | null;
  badgeTextHi: string | null;
  highlight?: boolean;
}

export const DEFAULT_COIN_PACKAGES: readonly CoinPackageDisplay[] = [
  {
    sku: 'shubh_150',
    name: 'Param Starter',
    nameHi: 'परम प्रारंभिक पैक',
    coins: 150,
    bonusCoins: 0,
    totalCoins: 150,
    priceInr: 100,
    watchMinutes: Math.floor(150 / COINS_PER_MINUTE),
    badgeText: 'Quick Darshan',
    badgeTextHi: 'त्वरित दर्शन',
  },
  {
    sku: 'bhakti_330',
    name: 'Bhakti Pack',
    nameHi: 'भक्ति पैक',
    coins: 300,
    bonusCoins: 30,
    totalCoins: 330,
    priceInr: 200,
    watchMinutes: Math.floor(330 / COINS_PER_MINUTE),
    badgeText: '+10% Bonus',
    badgeTextHi: '+10% बोनस',
  },
  {
    sku: 'siddhi_900',
    name: 'Siddhi Pack',
    nameHi: 'सिद्धि पैक',
    coins: 750,
    bonusCoins: 150,
    totalCoins: 900,
    priceInr: 500,
    watchMinutes: Math.floor(900 / COINS_PER_MINUTE),
    badgeText: 'Most Popular (+20% Bonus)',
    badgeTextHi: 'सर्वाधिक लोकप्रिय (+20% बोनस)',
    highlight: true,
  },
  {
    sku: 'mahodadhi_1875',
    name: 'Mahodadhi Pack',
    nameHi: 'महोदधि पैक',
    coins: 1500,
    bonusCoins: 375,
    totalCoins: 1875,
    priceInr: 1000,
    watchMinutes: Math.floor(1875 / COINS_PER_MINUTE),
    badgeText: 'Best Value (+25% Bonus)',
    badgeTextHi: 'सर्वश्रेष्ठ मूल्य (+25% बोनस)',
  },
];

/** Returns localized display title and badge label for a coin package SKU or API payload. */
export function getCoinPackageDisplay(
  pkg: { sku: string; name: string; bonusCoins?: number; badgeText?: string | null },
  lang: 'en' | 'hi',
): { title: string; badge: string | null } {
  if (lang !== 'hi') {
    return { title: pkg.name, badge: pkg.badgeText ?? null };
  }
  const known = DEFAULT_COIN_PACKAGES.find((d) => d.sku === pkg.sku);
  if (known) {
    return {
      title: known.nameHi,
      badge: pkg.badgeText ? known.badgeTextHi : null,
    };
  }
  const badgeMatch = pkg.badgeText?.match(/^\+(\d+(?:%)?)\s+Bonus$/i);
  const badgeHi = badgeMatch
    ? `+${badgeMatch[1]} बोनस`
    : pkg.badgeText === 'Sacred Pack'
      ? 'पवित्र पैक'
      : (pkg.badgeText ?? null);
  return { title: pkg.name, badge: badgeHi };
}

/**
 * Converts integer coins to INR rounded cleanly to 2 decimals via integer paise arithmetic
 * at 150 coins = ₹100 (1 coin = ₹0.6667).
 */
export function coinsToInr(coins: number): number {
  const safeCoins = Math.max(0, Math.round(coins));
  return Math.round((safeCoins * 10000) / COINS_PER_100_INR) / 100;
}

export function formatInrAmount(amountInr: number): string {
  const isWhole = Math.abs(amountInr - Math.round(amountInr)) < 0.005;
  return amountInr.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatInrFromCoins(coins: number): string {
  return formatInrAmount(coinsToInr(coins));
}

export function calculateStreamerNetCoinsInr(coins: number) {
  const safeCoins = Math.max(0, Math.round(coins));
  const grossPaise = Math.round((safeCoins * 10000) / COINS_PER_100_INR);
  const netPaise = Math.round((grossPaise * STREAMER_SHARE_PERCENT) / 100);
  const feePaise = grossPaise - netPaise;

  return {
    coins: safeCoins,
    grossInr: grossPaise / 100,
    netInr: netPaise / 100,
    platformFeeInr: feePaise / 100,
  };
}

/**
 * Keeps localStorage (`pooja_wallet_balance` and `pooja_user.wallet`) and the
 * Navbar coin pill synchronized immediately after any top-up, meter tick, or Dakshina spend.
 */
export function syncLocalWalletBalance(balanceCoins: number) {
  if (typeof window === 'undefined' || !Number.isFinite(balanceCoins)) return;
  const safeBalance = Math.max(0, Math.round(balanceCoins));
  try {
    localStorage.setItem('pooja_wallet_balance', String(safeBalance));
    const storedUser = localStorage.getItem('pooja_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      parsed.wallet = { ...(parsed.wallet || {}), balanceCoins: safeBalance };
      localStorage.setItem('pooja_user', JSON.stringify(parsed));
    }
    window.dispatchEvent(
      new CustomEvent('sd-wallet-updated', { detail: { balanceCoins: safeBalance } }),
    );
  } catch {
    // Ignore storage/event errors in restricted contexts
  }
}
