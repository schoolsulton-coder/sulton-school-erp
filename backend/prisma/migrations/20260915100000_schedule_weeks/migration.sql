-- Dars jadvali haftalari: har hafta (masalan 14.09–19.09.2026) o'z jadvaliga ega bo'ladi.
CREATE TABLE "schedule_weeks" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_weeks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "schedule_weeks_startDate_key" ON "schedule_weeks"("startDate");

ALTER TABLE "schedules" ADD COLUMN "weekId" TEXT;

CREATE INDEX "schedules_weekId_classId_idx" ON "schedules"("weekId", "classId");
CREATE INDEX "schedules_weekId_teacherId_idx" ON "schedules"("weekId", "teacherId");

ALTER TABLE "schedules" ADD CONSTRAINT "schedules_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "schedule_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mavjud (haftaga bog'lanmagan) jadval — joriy haftaga biriktiriladi:
-- Toshkent vaqti bo'yicha shu haftaning Dushanbasi – Shanbasi. Hech narsa yo'qolmaydi.
INSERT INTO "schedule_weeks" ("id", "startDate", "endDate", "note")
SELECT gen_random_uuid()::text,
       date_trunc('week', now() AT TIME ZONE 'Asia/Tashkent')::date::timestamp,
       (date_trunc('week', now() AT TIME ZONE 'Asia/Tashkent')::date + 5)::timestamp,
       'Avvalgi doimiy jadvaldan ko''chirildi'
WHERE EXISTS (SELECT 1 FROM "schedules" WHERE "weekId" IS NULL);

UPDATE "schedules"
SET "weekId" = (SELECT "id" FROM "schedule_weeks" ORDER BY "startDate" DESC LIMIT 1)
WHERE "weekId" IS NULL;
