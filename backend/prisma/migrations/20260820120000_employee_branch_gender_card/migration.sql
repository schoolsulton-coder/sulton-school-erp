-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "cardNumber" TEXT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
