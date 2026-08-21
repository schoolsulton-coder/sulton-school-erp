-- CreateTable
CREATE TABLE "employment_contracts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "employment" TEXT,
    "stavka" DOUBLE PRECISION,
    "branchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'YARATILGAN',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employment_contracts_employeeId_idx" ON "employment_contracts"("employeeId");

-- CreateIndex
CREATE INDEX "employment_contracts_date_idx" ON "employment_contracts"("date");

-- AddForeignKey
ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
