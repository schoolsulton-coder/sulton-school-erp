-- CreateTable
CREATE TABLE "flow_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'SOM',
    "kassaTuri" TEXT NOT NULL DEFAULT 'Naqd',
    "userId" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flow_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flow_accounts_branchId_idx" ON "flow_accounts"("branchId");

-- CreateIndex
CREATE INDEX "flow_accounts_currency_idx" ON "flow_accounts"("currency");

-- AddForeignKey
ALTER TABLE "flow_accounts" ADD CONSTRAINT "flow_accounts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_accounts" ADD CONSTRAINT "flow_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
