-- Audit trail for the public-stream video guest slot
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'VIDEO_GRANT';
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'VIDEO_REVOKE';
