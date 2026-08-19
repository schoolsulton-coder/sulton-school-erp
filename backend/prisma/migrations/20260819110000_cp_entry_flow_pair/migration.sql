-- AlterTable: kontragent juftligi
ALTER TABLE "counterparties" ADD COLUMN "pairId" TEXT;

-- AlterTable: yozuv ↔ tashqi hisob + capex/operation
ALTER TABLE "counterparty_entries"
    ADD COLUMN "somFlowAccountId" TEXT,
    ADD COLUMN "dollarKassaTuri" TEXT,
    ADD COLUMN "dollarFlowAccountId" TEXT,
    ADD COLUMN "capex" DOUBLE PRECISION,
    ADD COLUMN "operation" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "counterparties_pairId_idx" ON "counterparties"("pairId");

-- CreateIndex
CREATE INDEX "counterparty_entries_somFlowAccountId_idx" ON "counterparty_entries"("somFlowAccountId");

-- CreateIndex
CREATE INDEX "counterparty_entries_dollarFlowAccountId_idx" ON "counterparty_entries"("dollarFlowAccountId");

-- AddForeignKey
ALTER TABLE "counterparties" ADD CONSTRAINT "counterparties_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "counterparties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_entries" ADD CONSTRAINT "counterparty_entries_somFlowAccountId_fkey" FOREIGN KEY ("somFlowAccountId") REFERENCES "flow_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_entries" ADD CONSTRAINT "counterparty_entries_dollarFlowAccountId_fkey" FOREIGN KEY ("dollarFlowAccountId") REFERENCES "flow_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
