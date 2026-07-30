-- Statistika/jurnal so'rovlari uchun indekslar (xavfsiz, additive — ma'lumotga tegmaydi)
CREATE INDEX IF NOT EXISTS "grades_subjectId_type_date_idx" ON "grades" ("subjectId", "type", "date");
CREATE INDEX IF NOT EXISTS "grades_teacherId_idx" ON "grades" ("teacherId");
