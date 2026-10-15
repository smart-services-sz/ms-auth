CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Argentina',
    "province" TEXT,
    "defaultCity" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "allowedCountries" TEXT[] NOT NULL DEFAULT ARRAY['Argentina']::TEXT[],
    "allowedAdminAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MunicipalityArea" (
    "municipalityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MunicipalityArea_pkey" PRIMARY KEY ("municipalityId", "slug")
);

CREATE TABLE "MunicipalityCategory" (
    "municipalityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultPriority" TEXT NOT NULL DEFAULT 'media',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MunicipalityCategory_pkey" PRIMARY KEY ("municipalityId", "code")
);

CREATE TABLE "MunicipalityNeighborhood" (
    "municipalityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaSlug" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MunicipalityNeighborhood_pkey" PRIMARY KEY ("municipalityId", "slug")
);

CREATE TABLE "MunicipalityRule" (
    "municipalityId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MunicipalityRule_pkey" PRIMARY KEY ("municipalityId", "key")
);

CREATE INDEX "Municipality_isActive_name_idx" ON "Municipality"("isActive", "name");
CREATE INDEX "MunicipalityArea_municipalityId_isActive_idx" ON "MunicipalityArea"("municipalityId", "isActive");
CREATE INDEX "MunicipalityCategory_municipalityId_isActive_idx" ON "MunicipalityCategory"("municipalityId", "isActive");
CREATE INDEX "MunicipalityNeighborhood_municipalityId_areaSlug_isActive_idx" ON "MunicipalityNeighborhood"("municipalityId", "areaSlug", "isActive");
CREATE INDEX "MunicipalityRule_municipalityId_isActive_idx" ON "MunicipalityRule"("municipalityId", "isActive");

ALTER TABLE "MunicipalityArea"
ADD CONSTRAINT "MunicipalityArea_municipalityId_fkey"
FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MunicipalityCategory"
ADD CONSTRAINT "MunicipalityCategory_municipalityId_fkey"
FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MunicipalityNeighborhood"
ADD CONSTRAINT "MunicipalityNeighborhood_municipalityId_fkey"
FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MunicipalityRule"
ADD CONSTRAINT "MunicipalityRule_municipalityId_fkey"
FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;