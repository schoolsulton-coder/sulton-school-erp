-- Oldi-berdi/investitsiya yozuvi endi faqat TASDIQLANGANDA kassa balansiga tushadi.
-- Mavjud yozuvlarning puli yaratilish paytida allaqachon balansga qo'shilgan —
-- shuning uchun ularni tasdiqlangan deb belgilaymiz (balans o'zgarmaydi,
-- registrda «drift» paydo bo'lmaydi va qayta hisoblanib ikki marta qo'shilmaydi).
-- Transfer legilariga tegilmaydi — ular o'z tasdiq oqimida.
UPDATE "counterparty_entries"
SET "confirmedAt" = "createdAt"
WHERE "confirmedAt" IS NULL
  AND "transferPairId" IS NULL;
