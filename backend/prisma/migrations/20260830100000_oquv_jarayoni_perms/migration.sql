-- Koordinator, Ustoz (teacher), Kurator rollariga "O'quv jarayoni" bo'limini
-- ko'rish uchun view ruxsatlarini beradi (idempotent).
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."slug" IN ('coordinator', 'teacher', 'curator')
  AND p."slug" IN ('grades.view', 'attendance.view', 'homework.view', 'behavior.view')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
