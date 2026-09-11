-- Coin (rag'bat ballari) jadvali: o'quvchiga coin qo'shish/ayirish tarixi.
-- amount > 0 — qo'shildi, amount < 0 — ayirildi. Balans = amount yig'indisi.
CREATE TABLE IF NOT EXISTS "coin_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "coin_records_studentId_date_idx" ON "coin_records"("studentId", "date");

ALTER TABLE "coin_records"
    ADD CONSTRAINT "coin_records_studentId_fkey" FOREIGN KEY ("studentId")
    REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coin_records"
    ADD CONSTRAINT "coin_records_authorId_fkey" FOREIGN KEY ("authorId")
    REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
