-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "rulesVersion" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "requirementsConfidenceNote" TEXT,
ADD COLUMN     "requirementsGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "requirementsJson" JSONB,
ADD COLUMN     "requirementsReviewFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "requirementsRulesVersion" TEXT;
