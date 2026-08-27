-- FlowAccount: bank/karta tafsilotlari (Hisoblar boy ko'rinishi uchun)
ALTER TABLE "flow_accounts" ADD COLUMN "bankName" TEXT;
ALTER TABLE "flow_accounts" ADD COLUMN "cardNumber" TEXT;
ALTER TABLE "flow_accounts" ADD COLUMN "cardHolder" TEXT;
ALTER TABLE "flow_accounts" ADD COLUMN "cardType" TEXT;
