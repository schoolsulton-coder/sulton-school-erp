-- Shartnoma holati qo'lda o'zgargan vaqt — CEO dashboard'dagi "Ketganlar" (davr bo'yicha) uchun
ALTER TABLE "contracts" ADD COLUMN "statusChangedAt" TIMESTAMP(3);

-- Mavjud "ketgan/to'xtatilgan" shartnomalar uchun eng yaqin taxmin — oxirgi tahrir vaqti
UPDATE "contracts" SET "statusChangedAt" = "updatedAt"
WHERE "status" IN ('CANCELLED', 'LEFT', 'INACTIVE', 'SUSPENDED', 'TEMP_SUSPENDED', 'OVERDUE');
