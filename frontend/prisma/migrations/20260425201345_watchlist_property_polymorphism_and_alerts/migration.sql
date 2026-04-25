-- AlterTable
ALTER TABLE "WatchlistItem" ADD COLUMN     "propertyId" TEXT,
ALTER COLUMN "marketId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MarketChangeEvent" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "rulesVersionFrom" TEXT,
    "rulesVersionTo" TEXT NOT NULL,
    "changeSummary" JSONB NOT NULL,
    "severity" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketChangeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minSeverity" TEXT NOT NULL DEFAULT 'low',
    "digestFrequency" TEXT NOT NULL DEFAULT 'immediate',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changeEventId" TEXT NOT NULL,
    "watchKind" TEXT NOT NULL,
    "watchTargetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "channel" TEXT NOT NULL DEFAULT 'email',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketChangeEvent_marketId_detectedAt_idx" ON "MarketChangeEvent"("marketId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_sentAt_idx" ON "Notification"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_changeEventId_watchKind_watchTargetId_key" ON "Notification"("userId", "changeEventId", "watchKind", "watchTargetId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_propertyId_key" ON "WatchlistItem"("userId", "propertyId");

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketChangeEvent" ADD CONSTRAINT "MarketChangeEvent_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_changeEventId_fkey" FOREIGN KEY ("changeEventId") REFERENCES "MarketChangeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
