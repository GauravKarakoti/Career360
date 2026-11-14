-- Additive: optional "preferred" (nice-to-have) requirements, separate from mandatory ones.
ALTER TABLE "Opportunity" ADD COLUMN "preferred" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
