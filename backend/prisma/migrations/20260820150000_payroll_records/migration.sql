-- CreateTable
CREATE TABLE "payroll_records" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "ishchiKunlar" INTEGER NOT NULL DEFAULT 0,
    "ishlaganKun" INTEGER NOT NULL DEFAULT 0,
    "ishlaganSoat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "asosiyOylik" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soatlikNarx" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rasmiyHisob" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soliqKim" TEXT,
    "kpi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ovqatPuli" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tatilKartaga" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tatilNaqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ijara" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transport" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jarima" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soliq" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "naqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "karta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jami" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_records_period_idx" ON "payroll_records"("period");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_period_employeeId_key" ON "payroll_records"("period", "employeeId");

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
