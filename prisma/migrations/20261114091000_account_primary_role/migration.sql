-- Additive: remember the role chosen at sign-up so dashboards can be role-aware.
ALTER TABLE "Account" ADD COLUMN "primaryRole" TEXT;
