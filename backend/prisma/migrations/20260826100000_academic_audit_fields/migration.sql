-- Audit maydonlari: kim qo'shgan / qachon qo'shgan (O'quv jarayoni oynalari)

-- Grades: qachon qo'yilgan (teacherId allaqachon bor)
ALTER TABLE "grades" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "grades" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Attendance: kim belgilagan + qachon (avval umuman yo'q edi)
ALTER TABLE "attendances" ADD COLUMN "markedById" TEXT;
ALTER TABLE "attendances" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "attendances" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_markedById_fkey"
    FOREIGN KEY ("markedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "attendances_markedById_idx" ON "attendances"("markedById");

-- Behavior: qachon qo'shilgan (authorId allaqachon bor)
ALTER TABLE "behavior_records" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "behavior_records" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
