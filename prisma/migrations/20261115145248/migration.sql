/*
  Warnings:

  - You are about to drop the column `searchVector` on the `Opportunity` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Opportunity_searchVector_idx";

-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN "searchVector";

-- CreateTable
CREATE TABLE "OpportunityTranslation" (
    "opportunityId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT[],
    "offers" TEXT[],
    "sourceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityTranslation_pkey" PRIMARY KEY ("opportunityId","lang")
);

-- AddForeignKey
ALTER TABLE "OpportunityTranslation" ADD CONSTRAINT "OpportunityTranslation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
