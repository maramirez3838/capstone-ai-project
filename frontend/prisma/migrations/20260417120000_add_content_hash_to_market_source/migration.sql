-- Add contentHash to MarketSource for compliance monitor agent
-- Stores SHA-256 of stripped page text to skip unchanged sources (zero AI cost)
ALTER TABLE "MarketSource" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
