-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PLANNED', 'ARRIVED', 'NO_SHOW', 'CANCELLED');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "visitStatus" "VisitStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN     "visitedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "admission_plans" (
    "id" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "filial" TEXT,
    "gradeLevel" INTEGER NOT NULL,
    "plannedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_plans_pkey" PRIMARY KEY ("id")
);
