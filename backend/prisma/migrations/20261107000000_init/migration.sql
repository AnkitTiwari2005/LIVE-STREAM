-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('VIEWER', 'STREAMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETION_REQUESTED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_APPLIED', 'PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_NEEDED');

-- CreateEnum
CREATE TYPE "StreamVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'RECONNECTING_GRACE_PERIOD', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('STREAM', 'STREAMER', 'CHAT_MESSAGE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'ACTION_TAKEN', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('MUTE', 'KICK', 'BLOCK', 'BAN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('RAZORPAY', 'CASHFREE', 'MOCK');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WalletTxCategory" AS ENUM ('JOINING_BONUS', 'TOPUP_PURCHASE', 'STREAM_METERED_VIEW', 'DAKSHINA_OFFERING', 'ADMIN_ADJUSTMENT', 'PROMOTIONAL_REWARD');

-- CreateEnum
CREATE TYPE "ViewingSessionStatus" AS ENUM ('ACTIVE', 'PAUSED_LOW_BALANCE', 'COMPLETED_NATURAL', 'EVICTED_ZERO_BALANCE', 'DISCONNECTED_TIMEOUT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyTokenHash" TEXT,
    "resetTokenHash" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "emailNotification" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorSecretEnc" TEXT,
    "twoFactorBackupCodes" TEXT[],
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isAgeConfirmed18Plus" BOOLEAN NOT NULL DEFAULT false,
    "consentRecordedAt" TIMESTAMPTZ,
    "termsVersionAccepted" TEXT DEFAULT 'v1.0',
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "languages" TEXT[],
    "specialties" TEXT[],
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_APPLIED',
    "kycDocuments" JSONB,
    "kycReviewedAt" TIMESTAMPTZ,
    "rejectionReason" TEXT,
    "isVerifiedBadge" BOOLEAN NOT NULL DEFAULT false,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StreamerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stream" (
    "id" TEXT NOT NULL,
    "streamerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "visibility" "StreamVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "StreamStatus" NOT NULL DEFAULT 'DRAFT',
    "videoQuality" TEXT NOT NULL DEFAULT '480p',
    "scheduledAt" TIMESTAMPTZ,
    "startedAt" TIMESTAMPTZ,
    "endedAt" TIMESTAMPTZ,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "livekitRoomSid" TEXT,
    "isChatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isChatFollowerOnly" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateAccessLink" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenEncrypted" TEXT NOT NULL,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMPTZ,
    "maxViewers" INTEGER,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "requireLogin" BOOLEAN NOT NULL DEFAULT true,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PrivateAccessLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerSession" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "privateLinkId" TEXT,
    "sessionFingerprint" TEXT,
    "ipAddress" TEXT,
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMPTZ,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ViewerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedViewer" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionFingerprint" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedViewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT,
    "message" VARCHAR(500) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "streamerId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "isSentScheduled" BOOLEAN NOT NULL DEFAULT false,
    "isSent15Min" BOOLEAN NOT NULL DEFAULT false,
    "isSentLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "streamId" TEXT,
    "targetUserId" TEXT,
    "chatMessageId" TEXT,
    "reason" VARCHAR(255) NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "handledBy" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "sessionFingerprint" TEXT,
    "streamId" TEXT,
    "actionType" "ModerationActionType" NOT NULL,
    "reason" TEXT,
    "durationMinutes" INTEGER,
    "expiresAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetResource" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatWordFilter" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatWordFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DakshinaOffering" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "devoteeId" TEXT,
    "devoteeName" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "prayerMessage" VARCHAR(500),
    "gotra" VARCHAR(100),
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DakshinaOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceCoins" INTEGER NOT NULL DEFAULT 0,
    "bonusCoins" INTEGER NOT NULL DEFAULT 0,
    "purchasedCoins" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "category" "WalletTxCategory" NOT NULL,
    "amountCoins" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "streamId" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamViewingSession" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "status" "ViewingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTickAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ,
    "totalMinutesWatched" INTEGER NOT NULL DEFAULT 1,
    "totalCoinsDebited" INTEGER NOT NULL DEFAULT 5,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "StreamViewingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeterTickLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "minuteIndex" INTEGER NOT NULL,
    "coinsCharged" INTEGER NOT NULL DEFAULT 5,
    "balanceAfter" INTEGER NOT NULL,
    "tickedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterTickLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinPackage" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "bonusCoins" INTEGER NOT NULL DEFAULT 0,
    "totalCoins" INTEGER NOT NULL,
    "priceInr" DECIMAL(10,2) NOT NULL,
    "badgeText" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTopupOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "coinsToCredit" INTEGER NOT NULL,
    "amountInr" DECIMAL(10,2) NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WalletTopupOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerProfile_userId_key" ON "StreamerProfile"("userId");

-- CreateIndex
CREATE INDEX "StreamerProfile_kycStatus_idx" ON "StreamerProfile"("kycStatus");

-- CreateIndex
CREATE UNIQUE INDEX "StreamCategory_name_key" ON "StreamCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StreamCategory_slug_key" ON "StreamCategory"("slug");

-- CreateIndex
CREATE INDEX "StreamCategory_isActive_displayOrder_idx" ON "StreamCategory"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "Stream_status_visibility_scheduledAt_idx" ON "Stream"("status", "visibility", "scheduledAt");

-- CreateIndex
CREATE INDEX "Stream_streamerId_idx" ON "Stream"("streamerId");

-- CreateIndex
CREATE INDEX "Stream_categoryId_idx" ON "Stream"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateAccessLink_tokenHash_key" ON "PrivateAccessLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PrivateAccessLink_tokenHash_isRevoked_idx" ON "PrivateAccessLink"("tokenHash", "isRevoked");

-- CreateIndex
CREATE INDEX "ViewerSession_streamId_userId_idx" ON "ViewerSession"("streamId", "userId");

-- CreateIndex
CREATE INDEX "ViewerSession_streamId_sessionFingerprint_idx" ON "ViewerSession"("streamId", "sessionFingerprint");

-- CreateIndex
CREATE INDEX "BlockedViewer_streamId_userId_idx" ON "BlockedViewer"("streamId", "userId");

-- CreateIndex
CREATE INDEX "BlockedViewer_streamId_sessionFingerprint_idx" ON "BlockedViewer"("streamId", "sessionFingerprint");

-- CreateIndex
CREATE INDEX "ChatMessage_streamId_createdAt_idx" ON "ChatMessage"("streamId", "createdAt");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_streamerId_idx" ON "Follow"("streamerId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_streamerId_key" ON "Follow"("followerId", "streamerId");

-- CreateIndex
CREATE INDEX "StreamReminder_streamId_idx" ON "StreamReminder"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamReminder_userId_streamId_key" ON "StreamReminder"("userId", "streamId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAction_targetUserId_streamId_actionType_idx" ON "ModerationAction"("targetUserId", "streamId", "actionType");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatWordFilter_word_key" ON "ChatWordFilter"("word");

-- CreateIndex
CREATE INDEX "ChatWordFilter_isActive_idx" ON "ChatWordFilter"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StaticPage_slug_key" ON "StaticPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DakshinaOffering_orderId_key" ON "DakshinaOffering"("orderId");

-- CreateIndex
CREATE INDEX "DakshinaOffering_streamId_status_idx" ON "DakshinaOffering"("streamId", "status");

-- CreateIndex
CREATE INDEX "DakshinaOffering_devoteeId_idx" ON "DakshinaOffering"("devoteeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_key" ON "UserWallet"("userId");

-- CreateIndex
CREATE INDEX "UserWallet_userId_idx" ON "UserWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_idempotencyKey_key" ON "WalletTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_streamId_idx" ON "WalletTransaction"("streamId");

-- CreateIndex
CREATE INDEX "WalletTransaction_idempotencyKey_idx" ON "WalletTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "StreamViewingSession_sessionToken_key" ON "StreamViewingSession"("sessionToken");

-- CreateIndex
CREATE INDEX "StreamViewingSession_userId_status_idx" ON "StreamViewingSession"("userId", "status");

-- CreateIndex
CREATE INDEX "StreamViewingSession_streamId_status_idx" ON "StreamViewingSession"("streamId", "status");

-- CreateIndex
CREATE INDEX "StreamViewingSession_sessionToken_idx" ON "StreamViewingSession"("sessionToken");

-- CreateIndex
CREATE INDEX "MeterTickLog_sessionId_idx" ON "MeterTickLog"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "MeterTickLog_sessionId_minuteIndex_key" ON "MeterTickLog"("sessionId", "minuteIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CoinPackage_sku_key" ON "CoinPackage"("sku");

-- CreateIndex
CREATE INDEX "CoinPackage_isActive_displayOrder_idx" ON "CoinPackage"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTopupOrder_orderId_key" ON "WalletTopupOrder"("orderId");

-- CreateIndex
CREATE INDEX "WalletTopupOrder_userId_status_idx" ON "WalletTopupOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "WalletTopupOrder_orderId_idx" ON "WalletTopupOrder"("orderId");

-- AddForeignKey
ALTER TABLE "StreamerProfile" ADD CONSTRAINT "StreamerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "StreamCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateAccessLink" ADD CONSTRAINT "PrivateAccessLink_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerSession" ADD CONSTRAINT "ViewerSession_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerSession" ADD CONSTRAINT "ViewerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerSession" ADD CONSTRAINT "ViewerSession_privateLinkId_fkey" FOREIGN KEY ("privateLinkId") REFERENCES "PrivateAccessLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedViewer" ADD CONSTRAINT "BlockedViewer_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedViewer" ADD CONSTRAINT "BlockedViewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "StreamerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamReminder" ADD CONSTRAINT "StreamReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamReminder" ADD CONSTRAINT "StreamReminder_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DakshinaOffering" ADD CONSTRAINT "DakshinaOffering_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DakshinaOffering" ADD CONSTRAINT "DakshinaOffering_devoteeId_fkey" FOREIGN KEY ("devoteeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "UserWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamViewingSession" ADD CONSTRAINT "StreamViewingSession_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamViewingSession" ADD CONSTRAINT "StreamViewingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserWallet"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterTickLog" ADD CONSTRAINT "MeterTickLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StreamViewingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopupOrder" ADD CONSTRAINT "WalletTopupOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopupOrder" ADD CONSTRAINT "WalletTopupOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoinPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

