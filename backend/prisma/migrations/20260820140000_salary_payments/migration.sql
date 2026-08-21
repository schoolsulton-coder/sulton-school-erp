-- CreateTable
CREATE TABLE "salary_payments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "branchId" TEXT,
    "kassa" TEXT NOT NULL,
    "somAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dollarAmount" DOUBLE PRECISION,
    "dollarRate" DOUBLE PRECISION,
    "periodYear" INTEGER,
    "periodMonth" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_payments_employeeId_idx" ON "salary_payments"("employeeId");

-- CreateIndex
CREATE INDEX "salary_payments_date_idx" ON "salary_payments"("date");

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
