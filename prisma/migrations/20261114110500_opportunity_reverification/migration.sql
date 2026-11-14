-- Source re-verification: track whether the cited source still supports the listing.
ALTER TABLE "Opportunity" ADD COLUMN "sourceStatus" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "lastVerifiedAt" TIMESTAMP(3);
