-- CreateEnum
CREATE TYPE "StreamerEarningSource" AS ENUM ('DAKSHINA', 'WATCH_TIME');

-- AlterTable
ALTER TABLE "DakshinaOffering"
  ADD COLUMN "coins" INTEGER,
  ADD COLUMN "idempotencyKey" TEXT,
  ALTER COLUMN "amount" DROP NOT NULL,
  ALTER COLUMN "currency" DROP NOT NULL,
  ALTER COLUMN "currency" DROP DEFAULT,
  ALTER COLUMN "provider" DROP NOT NULL,
  ALTER COLUMN "provider" DROP DEFAULT,
  ALTER COLUMN "orderId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StreamerEarning" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "streamerId" TEXT NOT NULL,
    "viewerId" TEXT,
    "source" "StreamerEarningSource" NOT NULL,
    "coins" INTEGER NOT NULL,
    "referenceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamerEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DakshinaOffering_idempotencyKey_key" ON "DakshinaOffering"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerEarning_idempotencyKey_key" ON "StreamerEarning"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StreamerEarning_streamerId_createdAt_idx" ON "StreamerEarning"("streamerId", "createdAt");

-- CreateIndex
CREATE INDEX "StreamerEarning_streamId_idx" ON "StreamerEarning"("streamId");

-- AddForeignKey
ALTER TABLE "StreamerEarning" ADD CONSTRAINT "StreamerEarning_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerEarning" ADD CONSTRAINT "StreamerEarning_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerEarning" ADD CONSTRAINT "StreamerEarning_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve historical WalletTopupOrder FKs by deactivating legacy CoinPackages instead of deleting them
UPDATE "CoinPackage"
SET "isActive" = false
WHERE "sku" IN ('shubh_100', 'bhakti_275', 'siddhi_600', 'mahodadhi_1500');

-- Upsert Sacred Coin packages aligned to 150 coins = ₹100 (1.5 coins/₹)
INSERT INTO "CoinPackage" ("id", "sku", "name", "coins", "bonusCoins", "totalCoins", "priceInr", "badgeText", "displayOrder", "isActive")
VALUES
  (gen_random_uuid()::text, 'shubh_150', 'Shubh Starter', 150, 0, 150, 100.00, 'Quick Darshan', 1, true),
  (gen_random_uuid()::text, 'bhakti_330', 'Bhakti Pack', 300, 30, 330, 200.00, '+10% Bonus', 2, true),
  (gen_random_uuid()::text, 'siddhi_900', 'Siddhi Pack', 750, 150, 900, 500.00, 'Most Popular (+20% Bonus)', 3, true),
  (gen_random_uuid()::text, 'mahodadhi_1875', 'Mahodadhi Pack', 1500, 375, 1875, 1000.00, 'Best Value (+25% Bonus)', 4, true)
ON CONFLICT ("sku") DO UPDATE SET
  "name" = EXCLUDED."name",
  "coins" = EXCLUDED."coins",
  "bonusCoins" = EXCLUDED."bonusCoins",
  "totalCoins" = EXCLUDED."totalCoins",
  "priceInr" = EXCLUDED."priceInr",
  "badgeText" = EXCLUDED."badgeText",
  "displayOrder" = EXCLUDED."displayOrder",
  "isActive" = EXCLUDED."isActive";
