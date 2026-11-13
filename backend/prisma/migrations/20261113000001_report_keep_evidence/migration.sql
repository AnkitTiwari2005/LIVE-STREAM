-- A safety report must outlive the 30-day chat purge. Previously the FK was ON DELETE CASCADE, so the
-- purge silently deleted every report attached to a purged message - including OPEN, unreviewed ones.
ALTER TABLE "Report" DROP CONSTRAINT "Report_chatMessageId_fkey";
ALTER TABLE "Report" ADD CONSTRAINT "Report_chatMessageId_fkey"
  FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Evidence snapshot taken when the report is filed (the live row is purged after 30 days).
ALTER TABLE "Report" ADD COLUMN "reportedMessageText" VARCHAR(500);
