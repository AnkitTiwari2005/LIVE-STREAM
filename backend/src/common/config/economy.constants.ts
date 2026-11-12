export const COINS_PER_100_INR = 150;
export const STREAMER_SHARE_PERCENT = 85;
export const COINS_PER_MINUTE = 5;

export const MIN_DAKSHINA_COINS = 10;
export const MAX_DAKSHINA_COINS = 50000;

export const LEGACY_COIN_PACKAGE_SKUS = [
  'shubh_100',
  'bhakti_275',
  'siddhi_600',
  'mahodadhi_1500',
] as const;

export interface CoinPackageSeedItem {
  sku: string;
  name: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  priceInr: number;
  badgeText: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Unified Sacred Coin packages aligned to 150 base coins = ₹100 (1.5 coins/₹).
 * Shared between Prisma seeds, migrations, and documentation.
 */
export const COIN_PACKAGES_CATALOG: readonly CoinPackageSeedItem[] = [
  {
    sku: 'shubh_150',
    name: 'Shubh Starter',
    coins: 150,
    bonusCoins: 0,
    totalCoins: 150,
    priceInr: 100.0,
    badgeText: 'Quick Darshan',
    displayOrder: 1,
    isActive: true,
  },
  {
    sku: 'bhakti_330',
    name: 'Bhakti Pack',
    coins: 300,
    bonusCoins: 30,
    totalCoins: 330,
    priceInr: 200.0,
    badgeText: '+10% Bonus',
    displayOrder: 2,
    isActive: true,
  },
  {
    sku: 'siddhi_900',
    name: 'Siddhi Pack',
    coins: 750,
    bonusCoins: 150,
    totalCoins: 900,
    priceInr: 500.0,
    badgeText: 'Most Popular (+20% Bonus)',
    displayOrder: 3,
    isActive: true,
  },
  {
    sku: 'mahodadhi_1875',
    name: 'Mahodadhi Pack',
    coins: 1500,
    bonusCoins: 375,
    totalCoins: 1875,
    priceInr: 1000.0,
    badgeText: 'Best Value (+25% Bonus)',
    displayOrder: 4,
    isActive: true,
  },
];

/**
 * Converts integer coins to exact integer paise at 150 coins = ₹100 (10,000 paise).
 */
export function coinsToGrossPaise(coins: number): number {
  const safeCoins = Math.max(0, Math.round(coins));
  return Math.round((safeCoins * 100 * 100) / COINS_PER_100_INR);
}

export function coinsToGrossInr(coins: number): number {
  return coinsToGrossPaise(coins) / 100;
}

/**
 * Computes gross INR, 85% net streamer payout, and 15% platform fee rounded cleanly
 * to 2 decimals via integer paise arithmetic so netInr + platformFeeInr === grossInr.
 */
export function calculateCoinEarningsBreakdown(coins: number) {
  const safeCoins = Math.max(0, Math.round(coins));
  const grossPaise = coinsToGrossPaise(safeCoins);
  const netPaise = Math.round((grossPaise * STREAMER_SHARE_PERCENT) / 100);
  const feePaise = grossPaise - netPaise;

  return {
    coins: safeCoins,
    grossInr: grossPaise / 100,
    netInr: netPaise / 100,
    platformFeeInr: feePaise / 100,
  };
}
