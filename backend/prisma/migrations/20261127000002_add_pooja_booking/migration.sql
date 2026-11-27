-- CreateEnum
CREATE TYPE "PoojaBookingStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- CreateTable: PoojaBooking
CREATE TABLE "PoojaBooking" (
    "id"                TEXT NOT NULL,
    "refCode"           VARCHAR(24) NOT NULL,
    "devoteeId"         TEXT,
    "devoteeName"       VARCHAR(100) NOT NULL,
    "devoteeGotra"      VARCHAR(100),
    "panditId"          TEXT NOT NULL,
    "streamerProfileId" TEXT,
    "poojaId"           VARCHAR(80) NOT NULL,
    "poojaName"         VARCHAR(180) NOT NULL,
    "category"          VARCHAR(100),
    "dakshinaCoins"     INTEGER NOT NULL DEFAULT 0,
    "scheduledDate"     VARCHAR(32) NOT NULL,
    "timeSlot"          VARCHAR(120) NOT NULL,
    "sankalpIntent"     VARCHAR(500) NOT NULL,
    "status"            "PoojaBookingStatus" NOT NULL DEFAULT 'PENDING',
    "roomLink"          VARCHAR(300),
    "confirmedTime"     VARCHAR(200),
    "declineReason"     VARCHAR(300),
    "confirmedAt"       TIMESTAMPTZ,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoojaBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoojaBooking_refCode_key" ON "PoojaBooking"("refCode");
CREATE INDEX "PoojaBooking_devoteeId_createdAt_idx" ON "PoojaBooking"("devoteeId", "createdAt");
CREATE INDEX "PoojaBooking_panditId_status_createdAt_idx" ON "PoojaBooking"("panditId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "PoojaBooking" ADD CONSTRAINT "PoojaBooking_devoteeId_fkey"
    FOREIGN KEY ("devoteeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PoojaBooking" ADD CONSTRAINT "PoojaBooking_panditId_fkey"
    FOREIGN KEY ("panditId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PoojaBooking" ADD CONSTRAINT "PoojaBooking_streamerProfileId_fkey"
    FOREIGN KEY ("streamerProfileId") REFERENCES "StreamerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
