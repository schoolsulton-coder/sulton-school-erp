-- AlterTable
ALTER TABLE "salary_payments"
ADD COLUMN "somAccountId" TEXT,
ADD COLUMN "dollarKassa" TEXT,
ADD COLUMN "dollarAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_somAccountId_fkey" FOREIGN KEY ("somAccountId") REFERENCES "flow_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_dollarAccountId_fkey" FOREIGN KEY ("dollarAccountId") REFERENCES "flow_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
