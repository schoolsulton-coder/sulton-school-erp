-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "cardNumber" TEXT,
ADD COLUMN     "formal" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
