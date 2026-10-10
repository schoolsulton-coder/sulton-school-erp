-- Kunlik vazifalar: koordinator cheklisti → o'quvchining coini
-- daily_tasks: maktab bo'yicha umumiy ro'yxat (classId NULL) + sinfga qo'shimcha
-- daily_task_marks: bir o'quvchi · bir kun · bir vazifa (qator bor = bajarilgan)

CREATE TABLE "daily_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "classId" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_task_marks" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "coinRecordId" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_task_marks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "daily_tasks_classId_active_idx" ON "daily_tasks"("classId", "active");
CREATE UNIQUE INDEX "daily_task_marks_coinRecordId_key" ON "daily_task_marks"("coinRecordId");
CREATE UNIQUE INDEX "daily_task_marks_taskId_studentId_date_key" ON "daily_task_marks"("taskId", "studentId", "date");
CREATE INDEX "daily_task_marks_studentId_date_idx" ON "daily_task_marks"("studentId", "date");
CREATE INDEX "daily_task_marks_date_idx" ON "daily_task_marks"("date");

ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "daily_task_marks" ADD CONSTRAINT "daily_task_marks_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "daily_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_task_marks" ADD CONSTRAINT "daily_task_marks_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Coin yozuvi o'chirilsa (Coin oynasidan) — belgi ham olib tashlanadi
ALTER TABLE "daily_task_marks" ADD CONSTRAINT "daily_task_marks_coinRecordId_fkey"
    FOREIGN KEY ("coinRecordId") REFERENCES "coin_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_task_marks" ADD CONSTRAINT "daily_task_marks_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Boshlang'ich ro'yxat (maktab bo'yicha umumiy). Faqat ro'yxat bo'm-bo'sh bo'lsa qo'shiladi.
INSERT INTO "daily_tasks" ("id", "title", "coins", "sort", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid(), t.title, t.coins, t.sort, true, now(), now()
FROM (VALUES
    ('Erta uyg''onish (06:00 gacha)', 2, 1),
    ('Yugurish', 5, 2),
    ('Tong barakasida 10 bet kitob o''qish', 10, 3),
    ('Ota-ona uchun nonushta tayyorlash', 5, 4),
    ('Ota-ona duosini olish · kuniga 3 kishiga yaxshilik', 5, 5),
    ('Har kuni 30 bet kitob o''qish', 10, 6),
    ('Yaxshilik qutisiga 2000+ so''m ehson qilish', 5, 7)
) AS t(title, coins, sort)
WHERE NOT EXISTS (SELECT 1 FROM "daily_tasks");
