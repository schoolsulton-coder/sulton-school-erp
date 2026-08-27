-- Xodimga izoh (Izohlar)
CREATE TABLE "employee_notes" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "authorId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_notes_employeeId_createdAt_idx" ON "employee_notes"("employeeId", "createdAt");

ALTER TABLE "employee_notes" ADD CONSTRAINT "employee_notes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_notes" ADD CONSTRAINT "employee_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
