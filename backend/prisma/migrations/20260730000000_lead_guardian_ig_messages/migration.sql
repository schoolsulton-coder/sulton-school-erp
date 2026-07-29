-- Lead: vasiy ismi + Instagram username
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "guardianName" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "igUsername" TEXT;

-- Suhbat xabarlari (Instagram Direct va h.k.)
CREATE TABLE IF NOT EXISTS "lead_messages" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lead_messages_leadId_createdAt_idx" ON "lead_messages"("leadId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lead_messages_leadId_fkey'
  ) THEN
    ALTER TABLE "lead_messages"
      ADD CONSTRAINT "lead_messages_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- "Tasdiqlanmagan" bosqichi (Instagram/Sayt leadlar shu yerga tushadi) — order -1 (birinchi ko'rinadi)
-- UUID literal (PG versiyasiga bog'liq emas), idempotent
INSERT INTO "lead_stages" ("id", "name", "order", "color")
SELECT '345bcfe5-48cb-4117-9f08-5a86fdbfcf89', 'Tasdiqlanmagan', -1, '#f59e0b'
WHERE NOT EXISTS (SELECT 1 FROM "lead_stages" WHERE "name" = 'Tasdiqlanmagan');
