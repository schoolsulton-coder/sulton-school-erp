-- Tez-tez filtrlanadigan/saralanadigan ustunlar uchun qo'shimcha indekslar.
-- Faqat additive (CREATE INDEX) — ma'lumot va ustunlarga tegilmaydi.
-- CONCURRENTLY ISHLATILMAYDI: migratsiya tranzaksiya ichida bajariladi.

-- To'lovlar (payments): sana bo'yicha saralash/oraliq + tasdiq holati filtri
CREATE INDEX IF NOT EXISTS "payments_paidAt_idx" ON "payments"("paidAt");
CREATE INDEX IF NOT EXISTS "payments_confirmedAt_idx" ON "payments"("confirmedAt");

-- Xarajat to'lovlari (expense_payments): eski Moliya kassalari bo'yicha registr
CREATE INDEX IF NOT EXISTS "expense_payments_accountId_idx" ON "expense_payments"("accountId");
CREATE INDEX IF NOT EXISTS "expense_payments_dollarAccountId_idx" ON "expense_payments"("dollarAccountId");

-- Moliya tranzaksiyalari (transactions): kassa bo'yicha harakatlar
CREATE INDEX IF NOT EXISTS "transactions_accountId_idx" ON "transactions"("accountId");

-- Maosh to'lovlari (salary_payments): hisob bo'yicha harakatlar + davr filtri
CREATE INDEX IF NOT EXISTS "salary_payments_somAccountId_idx" ON "salary_payments"("somAccountId");
CREATE INDEX IF NOT EXISTS "salary_payments_dollarAccountId_idx" ON "salary_payments"("dollarAccountId");
CREATE INDEX IF NOT EXISTS "salary_payments_periodYear_periodMonth_idx" ON "salary_payments"("periodYear", "periodMonth");

-- Kontragent yozuvlari (counterparty_entries): ro'yxat sana bo'yicha saralanadi
CREATE INDEX IF NOT EXISTS "counterparty_entries_date_idx" ON "counterparty_entries"("date");

-- Ichki o'tkazmalar (internal_transfers): jo'natuvchi/qabul qiluvchi hisob bo'yicha
CREATE INDEX IF NOT EXISTS "internal_transfers_fromAccountId_idx" ON "internal_transfers"("fromAccountId");
CREATE INDEX IF NOT EXISTS "internal_transfers_toAccountId_idx" ON "internal_transfers"("toAccountId");

-- Davomat (attendances): sinf kunlik varaqasi va sinf statistikasi
CREATE INDEX IF NOT EXISTS "attendances_classId_date_idx" ON "attendances"("classId", "date");

-- Uyga vazifalar (homeworks): ustoz bo'yicha va muddat bo'yicha saralash
CREATE INDEX IF NOT EXISTS "homeworks_teacherId_idx" ON "homeworks"("teacherId");
CREATE INDEX IF NOT EXISTS "homeworks_dueDate_idx" ON "homeworks"("dueDate");

-- Shartnoma oylari (contract_installments): muddati o'tganlarni belgilash
CREATE INDEX IF NOT EXISTS "contract_installments_dueDate_idx" ON "contract_installments"("dueDate");

-- Dars jadvali (schedules): ustozning sinflari/bandligi
CREATE INDEX IF NOT EXISTS "schedules_teacherId_idx" ON "schedules"("teacherId");
