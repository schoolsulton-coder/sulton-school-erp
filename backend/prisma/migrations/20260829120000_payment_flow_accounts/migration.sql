-- Maktab to'lovi va xarajat to'lovini «Hisoblar» kassalariga (flow_accounts) bog'lash.
-- Eski accountId (Moliya kassa) saqlanadi — mavjud yozuvlar tegilmaydi.

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "flowAccountId" TEXT;

-- AlterTable
ALTER TABLE "expense_payments" ADD COLUMN "flowAccountId" TEXT,
                                ADD COLUMN "dollarFlowAccountId" TEXT;

-- CreateIndex
CREATE INDEX "payments_flowAccountId_idx" ON "payments"("flowAccountId");

-- CreateIndex
CREATE INDEX "expense_payments_flowAccountId_idx" ON "expense_payments"("flowAccountId");

-- CreateIndex
CREATE INDEX "expense_payments_dollarFlowAccountId_idx" ON "expense_payments"("dollarFlowAccountId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_flowAccountId_fkey" FOREIGN KEY ("flowAccountId") REFERENCES "flow_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payments" ADD CONSTRAINT "expense_payments_flowAccountId_fkey" FOREIGN KEY ("flowAccountId") REFERENCES "flow_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payments" ADD CONSTRAINT "expense_payments_dollarFlowAccountId_fkey" FOREIGN KEY ("dollarFlowAccountId") REFERENCES "flow_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
