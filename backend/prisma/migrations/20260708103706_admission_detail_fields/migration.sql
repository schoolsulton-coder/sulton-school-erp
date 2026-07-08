-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "demoStartDate" TIMESTAMP(3),
ADD COLUMN     "fatherStatus" TEXT,
ADD COLUMN     "motherStatus" TEXT,
ADD COLUMN     "psychologistConclusion" TEXT,
ADD COLUMN     "testLogicPct" INTEGER;
