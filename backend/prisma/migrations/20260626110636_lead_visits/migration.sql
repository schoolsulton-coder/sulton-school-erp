-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "crmUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "filial" TEXT,
ADD COLUMN     "gradeLevel" INTEGER,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "whoComes" TEXT;
