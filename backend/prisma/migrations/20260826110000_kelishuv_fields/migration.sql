-- Kelishuv (joriy oylik kelishuvi) qo'shimcha maydonlari
ALTER TABLE "salaries" ADD COLUMN "rasmiyOyligi" DOUBLE PRECISION;
ALTER TABLE "salaries" ADD COLUMN "soliqKim" TEXT;
ALTER TABLE "salaries" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "salaries" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "salaries" ADD COLUMN "note" TEXT;
