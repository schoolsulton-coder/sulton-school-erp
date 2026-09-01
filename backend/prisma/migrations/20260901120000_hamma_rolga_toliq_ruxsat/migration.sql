-- VAQTINCHALIK: dasturning barcha oynalari hamma xodimga ko'rinsin.
-- Barcha rollarga (o'quvchi va vasiydan tashqari) to'liq ruxsat beriladi — idempotent.
-- Rollarni qayta cheklash uchun keyingi migratsiyada ortiqcha qatorlarni o'chirib,
-- prisma/seed.ts dagi ROLE_PERMISSIONS bo'yicha qayta tiklang (npm run prisma:seed).
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."slug" NOT IN ('student', 'guardian')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
