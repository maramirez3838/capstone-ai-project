-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL DEFAULT 'CA',
    "countyName" TEXT,
    "regionLabel" TEXT,
    "strStatus" TEXT NOT NULL,
    "permitRequired" TEXT NOT NULL,
    "ownerOccupancyRequired" TEXT NOT NULL,
    "freshnessStatus" TEXT NOT NULL,
    "supportStatus" TEXT NOT NULL DEFAULT 'supported',
    "summary" TEXT NOT NULL,
    "notableRestrictions" TEXT,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketAlias" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketRule" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "details" TEXT,
    "codeRef" TEXT,
    "codeUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "jurisdictionLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSource" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "publisher" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "marketId" TEXT,
    "sessionId" TEXT,
    "eventName" TEXT NOT NULL,
    "queryText" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Market_slug_key" ON "Market"("slug");

-- CreateIndex
CREATE INDEX "MarketAlias_alias_idx" ON "MarketAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "MarketAlias_marketId_alias_key" ON "MarketAlias"("marketId", "alias");

-- CreateIndex
CREATE INDEX "MarketRule_marketId_ruleKey_idx" ON "MarketRule"("marketId", "ruleKey");

-- CreateIndex
CREATE INDEX "MarketSource_marketId_idx" ON "MarketSource"("marketId");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_marketId_key" ON "WatchlistItem"("userId", "marketId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_eventName_createdAt_idx" ON "TelemetryEvent"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "TelemetryEvent_marketId_idx" ON "TelemetryEvent"("marketId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_userId_idx" ON "TelemetryEvent"("userId");

-- AddForeignKey
ALTER TABLE "MarketAlias" ADD CONSTRAINT "MarketAlias_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketRule" ADD CONSTRAINT "MarketRule_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSource" ADD CONSTRAINT "MarketSource_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;
