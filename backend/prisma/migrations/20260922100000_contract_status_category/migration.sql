-- Shartnoma holatlari: Nofaol (to'lov qilmagani uchun) va Muddati o'tgan (to'lov kutilmoqda)
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';

-- "Boshqa" shartnoma turlari (Grand, Xodim farzandi, Yarim yillik, 6-oylik) — bo'sh = oddiy Oylik/Yillik
ALTER TABLE "contracts" ADD COLUMN "category" TEXT;
