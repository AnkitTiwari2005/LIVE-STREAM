import { Logger } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';

/**
 * Extracts all storage keys attached to a StreamerProfile.kycDocuments JSON payload.
 */
export function extractKycStorageKeys(kycDocuments: any): string[] {
  if (!kycDocuments) return [];
  const docs = Array.isArray(kycDocuments) ? kycDocuments : [kycDocuments];
  const keys: string[] = [];
  for (const doc of docs) {
    const key = typeof doc === 'string' ? doc : doc?.storageKey;
    if (key && typeof key === 'string') {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Deletes uploaded KYC files best-effort after DB commit so a rolled-back transaction never drops files.
 */
export async function deleteKycFilesBestEffort(
  keys: string[],
  storageService?: { deleteFile: (key: string) => Promise<any> } | null,
  logger?: Logger,
  userId?: string,
): Promise<void> {
  if (!storageService || keys.length === 0) return;
  for (const key of keys) {
    try {
      await storageService.deleteFile(key);
    } catch (err: any) {
      logger?.warn(`Failed to delete KYC file [${key}] for user [${userId || 'unknown'}]: ${err?.message || err}`);
    }
  }
}

export interface PerformAccountErasureParams {
  user: any;
  actorId: string;
  actorEmail: string;
  action: string;
  reason: string;
  extraDetails?: Record<string, any>;
}

/**
 * Executes irreversible DPDP Act 2023 personal-data anonymization, credential scrubbing,
 * wallet forfeiture, and audit logging within a Prisma client or transaction.
 */
export async function performAccountErasureTx(
  tx: any,
  params: PerformAccountErasureParams,
): Promise<{
  kycKeys: string[];
  forfeitedPaidCoins: number;
  forfeitedBonusCoins: number;
}> {
  const { user } = params;
  const userId = user.id;

  await tx.dakshinaOffering.updateMany({
    where: { devoteeId: userId },
    data: {
      devoteeName: 'Deleted Devotee',
      gotra: null,
      prayerMessage: null,
    },
  });

  if (tx.poojaBooking?.updateMany) {
    await Promise.resolve(
      tx.poojaBooking.updateMany({
        where: { devoteeId: userId },
        data: {
          devoteeName: 'Deleted Devotee',
          devoteeGotra: null,
          sankalpIntent: '[DPDP Redacted]',
        },
      }),
    ).catch(() => {});

    await Promise.resolve(
      tx.poojaBooking.updateMany({
        where: { panditId: userId, status: { in: ['PENDING', 'APPROVED'] } },
        data: {
          status: 'CANCELLED',
          declineReason: 'Pandit account closed',
        },
      }),
    ).catch(() => {});
  }

  if (tx.privateAccessLink?.updateMany) {
    await Promise.resolve(
      tx.privateAccessLink.updateMany({
        where: { stream: { streamerId: userId }, isRevoked: false },
        data: { isRevoked: true },
      }),
    ).catch(() => {});
  }

  const forfeitedPaidCoins = user.wallet?.purchasedCoins || 0;
  const forfeitedBonusCoins = user.wallet?.bonusCoins || 0;
  if (
    user.wallet &&
    ((user.wallet.balanceCoins || 0) > 0 || forfeitedPaidCoins > 0 || forfeitedBonusCoins > 0)
  ) {
    await Promise.resolve(
      tx.userWallet.update({
        where: { id: user.wallet.id },
        data: { balanceCoins: 0, bonusCoins: 0, purchasedCoins: 0 },
      }),
    ).catch(() => {});
  }

  const kycKeys = extractKycStorageKeys(user.streamerProfile?.kycDocuments);
  const anonymizedEmail = `deleted_${Date.now()}_${userId.slice(0, 8)}@paramdarshan.privacy`;

  await tx.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.DELETION_REQUESTED,
      deletedAt: new Date(),
      deletionRequestedAt: user.deletionRequestedAt ?? new Date(),
      passwordHash: null,
      emailVerifyTokenHash: null,
      googleId: null,
      resetTokenHash: null,
      resetTokenExpiry: null,
      twoFactorSecretEnc: null,
      twoFactorBackupCodes: [],
      isTwoFactorEnabled: false,
      email: anonymizedEmail,
      name: 'Deleted Devotee',
      avatarUrl: null,
      streamerProfile: user.streamerProfile
        ? {
            update: {
              slug: null,
              kycDocuments: Prisma.JsonNull,
              bio: null,
              specialties: [],
              languages: [],
            },
          }
        : undefined,
    },
  });

  await tx.auditLog.create({
    data: {
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: params.action,
      targetResource: `User:${userId}`,
      details: {
        reason: params.reason,
        forfeitedPaidCoins,
        forfeitedBonusCoins,
        ...(params.extraDetails || {}),
      },
    },
  });

  return { kycKeys, forfeitedPaidCoins, forfeitedBonusCoins };
}
