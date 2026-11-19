-- AlterTable
ALTER TABLE "StreamerProfile" ADD COLUMN "hasSpecialBadge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StreamerProfile" ADD COLUMN "specialBadgeTitle" TEXT DEFAULT 'आचार्य रत्न';
