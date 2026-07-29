-- LeadMessage: Meta message id (mid) — webhook va sync takrorlanmasin
ALTER TABLE "lead_messages" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "lead_messages_externalId_key" ON "lead_messages"("externalId");
