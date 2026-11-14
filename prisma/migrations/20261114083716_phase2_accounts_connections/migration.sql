-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "evidence" JSONB;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "roles" TEXT[],
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'private';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "accountId" TEXT;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "recoveryCodeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionRequest" (
    "id" TEXT NOT NULL,
    "fromWorkspaceId" TEXT NOT NULL,
    "toWorkspaceId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ConnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE INDEX "ConnectionRequest_toWorkspaceId_status_idx" ON "ConnectionRequest"("toWorkspaceId", "status");

-- CreateIndex
CREATE INDEX "ConnectionRequest_fromWorkspaceId_status_idx" ON "ConnectionRequest"("fromWorkspaceId", "status");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_fromWorkspaceId_fkey" FOREIGN KEY ("fromWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_toWorkspaceId_fkey" FOREIGN KEY ("toWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
