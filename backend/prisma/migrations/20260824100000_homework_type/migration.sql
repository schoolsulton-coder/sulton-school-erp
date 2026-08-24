-- Vazifa turi (Homework.type) + qayta ishlatiladigan turlar ro'yxati
ALTER TABLE "homeworks" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'Uyga vazifa';

CREATE TABLE "homework_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "homework_types_name_key" ON "homework_types"("name");

-- Standart turlar (PostgreSQL 13+ da gen_random_uuid() mavjud)
INSERT INTO "homework_types" ("id", "name") VALUES
    (gen_random_uuid(), 'Uyga vazifa'),
    (gen_random_uuid(), 'Boshqa vazifa'),
    (gen_random_uuid(), 'Ijodiy ish')
ON CONFLICT ("name") DO NOTHING;
