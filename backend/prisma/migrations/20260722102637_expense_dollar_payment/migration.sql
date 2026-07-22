-- AlterTable
ALTER TABLE "expense_payments" ADD COLUMN     "dollarAccountId" TEXT,
ADD COLUMN     "dollarAmount" DOUBLE PRECISION,
ADD COLUMN     "dollarMethod" TEXT,
ADD COLUMN     "dollarRate" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "expense_payments" ADD CONSTRAINT "expense_payments_dollarAccountId_fkey" FOREIGN KEY ("dollarAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
