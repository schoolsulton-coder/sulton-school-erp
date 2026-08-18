-- CreateTable
CREATE TABLE "counterparties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OLDI_BERDICHI',
    "filiallararo" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparty_entries" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "somAmount" DOUBLE PRECISION,
    "dollarAmount" DOUBLE PRECISION,
    "dollarRate" DOUBLE PRECISION,
    "sabab" TEXT,
    "kassaTuri" TEXT,
    "accountId" TEXT,
    "branchId" TEXT,
    "periodYear" INTEGER,
    "periodMonth" INTEGER,
    "academicYear" TEXT,
    "investType" TEXT,
    "transferPairId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "counterparty_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparty_branches" (
    "counterpartyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "counterparty_branches_pkey" PRIMARY KEY ("counterpartyId","branchId")
);

-- CreateIndex
CREATE INDEX "counterparties_category_idx" ON "counterparties"("category");

-- CreateIndex
CREATE INDEX "counterparties_branchId_idx" ON "counterparties"("branchId");

-- CreateIndex
CREATE INDEX "counterparty_entries_counterpartyId_idx" ON "counterparty_entries"("counterpartyId");

-- CreateIndex
CREATE INDEX "counterparty_entries_accountId_idx" ON "counterparty_entries"("accountId");

-- CreateIndex
CREATE INDEX "counterparty_entries_transferPairId_idx" ON "counterparty_entries"("transferPairId");

-- CreateIndex
CREATE INDEX "counterparty_branches_branchId_idx" ON "counterparty_branches"("branchId");

-- AddForeignKey
ALTER TABLE "counterparties" ADD CONSTRAINT "counterparties_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_entries" ADD CONSTRAINT "counterparty_entries_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_entries" ADD CONSTRAINT "counterparty_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_branches" ADD CONSTRAINT "counterparty_branches_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_branches" ADD CONSTRAINT "counterparty_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
