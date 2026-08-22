-- AlterTable
ALTER TABLE "employees"
ADD COLUMN "middleName" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "passportSeriya" TEXT,
ADD COLUMN "passportRaqam" TEXT,
ADD COLUMN "passportBerilgan" TIMESTAMP(3),
ADD COLUMN "passportOrgan" TEXT,
ADD COLUMN "stir" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "mapLink" TEXT,
ADD COLUMN "employment" TEXT,
ADD COLUMN "kimIshlaydi" TEXT;

-- AlterTable
ALTER TABLE "salaries" ADD COLUMN "hisobKitob" TEXT;

-- CreateTable
CREATE TABLE "employee_branches" (
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "employee_branches_pkey" PRIMARY KEY ("employeeId","branchId")
);

-- CreateIndex
CREATE INDEX "employee_branches_branchId_idx" ON "employee_branches"("branchId");

-- AddForeignKey
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
