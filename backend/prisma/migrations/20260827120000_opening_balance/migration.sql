-- Boshlang'ich qoldiq: balance = openingBalance + Σ(harakatlar).
-- Reconcile (balans-tekshiruv) boshlang'ich qoldiqni yo'qotmasligi uchun.
ALTER TABLE "accounts" ADD COLUMN "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "flow_accounts" ADD COLUMN "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
