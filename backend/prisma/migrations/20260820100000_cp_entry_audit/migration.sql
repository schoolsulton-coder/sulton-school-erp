-- AlterTable: audit + tasdiq
ALTER TABLE "counterparty_entries"
    ADD COLUMN "createdById" TEXT,
    ADD COLUMN "updatedById" TEXT,
    ADD COLUMN "confirmedAt" TIMESTAMP(3),
    ADD COLUMN "confirmedById" TEXT,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "counterparty_entries" ADD CONSTRAINT "counterparty_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_entries" ADD CONSTRAINT "counterparty_entries_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_entries" ADD CONSTRAINT "counterparty_entries_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
