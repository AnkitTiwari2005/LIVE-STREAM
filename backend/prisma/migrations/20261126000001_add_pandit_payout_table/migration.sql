-- CreateTable: PanditPayout
-- Records manual settlement payments from admin to a pandit.
-- earnedCoins (from StreamerEarning) - paidCoins (sum here) = dueCoins
CREATE TABLE "PanditPayout" (
    "id"          TEXT NOT NULL,
    "streamerId"  TEXT NOT NULL,
    "coins"       INTEGER NOT NULL,
    "netPaise"    INTEGER NOT NULL,
    "periodFrom"  TIMESTAMPTZ,
    "periodTo"    TIMESTAMPTZ NOT NULL,
    "method"      VARCHAR(40),
    "reference"   VARCHAR(120) NOT NULL,
    "note"        TEXT,
    "paidById"    TEXT NOT NULL,
    "paidAt"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanditPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PanditPayout_streamerId_reference_key" ON "PanditPayout"("streamerId", "reference");
CREATE INDEX "PanditPayout_streamerId_paidAt_idx"           ON "PanditPayout"("streamerId", "paidAt");
CREATE INDEX "PanditPayout_paidById_idx"                   ON "PanditPayout"("paidById");

-- AddForeignKey
ALTER TABLE "PanditPayout" ADD CONSTRAINT "PanditPayout_streamerId_fkey"
    FOREIGN KEY ("streamerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PanditPayout" ADD CONSTRAINT "PanditPayout_paidById_fkey"
    FOREIGN KEY ("paidById")   REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
