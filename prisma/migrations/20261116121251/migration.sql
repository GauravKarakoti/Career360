/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,opportunityId]` on the table `Tracker` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ConnectionRequest" ADD COLUMN     "fromReadAt" TIMESTAMP(3),
ADD COLUMN     "toReadAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Tracker_workspaceId_opportunityId_key" ON "Tracker"("workspaceId", "opportunityId");
