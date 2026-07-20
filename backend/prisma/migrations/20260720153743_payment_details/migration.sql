-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "cardLast4" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "isRefund" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "updateCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT;

-- CreateIndex
CREATE INDEX "payments_accountId_idx" ON "payments"("accountId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
