-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "ContractStatus" ADD VALUE 'TEMP_SUSPENDED';
ALTER TYPE "ContractStatus" ADD VALUE 'LEFT';
ALTER TYPE "ContractStatus" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "type" "ContractType" NOT NULL DEFAULT 'MONTHLY';
