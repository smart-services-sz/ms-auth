-- AlterTable
ALTER TABLE "User"
ADD COLUMN "municipalityId" TEXT,
ADD COLUMN "areaId" TEXT;

-- CreateIndex
CREATE INDEX "User_municipalityId_areaId_idx" ON "User"("municipalityId", "areaId");
