-- AlterTable: sayt (Supabase) yozuvi id — takror import oldini oladi
ALTER TABLE "leads" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "leads_externalId_key" ON "leads"("externalId");
