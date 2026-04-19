-- AlterTable
ALTER TABLE "MarketSource" ADD COLUMN     "brokenSince" TIMESTAMP(3),
ADD COLUMN     "discoveryAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "replacesId" TEXT,
ADD COLUMN     "sourceStatus" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "MarketRuleSource" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "MarketRuleSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketRuleSource_ruleId_idx" ON "MarketRuleSource"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketRuleSource_ruleId_sourceId_key" ON "MarketRuleSource"("ruleId", "sourceId");

-- CreateIndex
CREATE INDEX "MarketSource_sourceStatus_idx" ON "MarketSource"("sourceStatus");

-- AddForeignKey
ALTER TABLE "MarketRuleSource" ADD CONSTRAINT "MarketRuleSource_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "MarketRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketRuleSource" ADD CONSTRAINT "MarketRuleSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MarketSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
