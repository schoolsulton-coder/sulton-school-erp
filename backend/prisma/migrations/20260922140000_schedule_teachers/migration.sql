-- Bir dars soatiga bir nechta ustoz
CREATE TABLE "schedule_teachers" (
    "scheduleId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "schedule_teachers_pkey" PRIMARY KEY ("scheduleId","teacherId")
);

CREATE INDEX "schedule_teachers_teacherId_idx" ON "schedule_teachers"("teacherId");

ALTER TABLE "schedule_teachers" ADD CONSTRAINT "schedule_teachers_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_teachers" ADD CONSTRAINT "schedule_teachers_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mavjud darslardagi ustoz — ro'yxatga ko'chiriladi
INSERT INTO "schedule_teachers" ("scheduleId", "teacherId")
SELECT id, "teacherId" FROM "schedules" WHERE "teacherId" IS NOT NULL
ON CONFLICT DO NOTHING;
