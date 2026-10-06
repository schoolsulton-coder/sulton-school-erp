-- ============================================================================
-- 1) Owner roli — maktab egasi: hamma oyna va ma'lumot ochiq
-- ============================================================================
INSERT INTO "roles" (id, name, slug, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Egasi (Owner)', 'owner', now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Owner va Superadmin — barcha ruxsatlar
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.slug IN ('owner', 'superadmin')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2) Qolgan rollar — faqat o'ziga tegishli ruxsatlar
--    (ilgari "hamma rolga to'liq ruxsat" migratsiyasi hammasini bergan edi)
-- ============================================================================
DELETE FROM "role_permissions"
WHERE "roleId" IN (
  SELECT id FROM "roles" WHERE slug IN ('admin', 'akademik', 'sales', 'coordinator', 'teacher', 'curator')
);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "roles" r
JOIN "permissions" p ON (
  -- Administrator: qabul, shartnoma/to'lov/qarzdor, o'quvchi/vasiy + sinflarni ko'rish
  (r.slug = 'admin' AND (p."group" IN ('crm', 'contracts', 'students') OR p.slug = 'classes.view'))
  -- Akademik bo'lim rahbari: ma'lumotlar + o'quv jarayoni
  OR (r.slug = 'akademik' AND p."group" IN ('students', 'classes', 'grades', 'attendance', 'homework', 'behavior'))
  -- Sotuv menejeri: qabul
  OR (r.slug = 'sales' AND p.slug IN ('crm.view', 'crm.create', 'crm.update', 'students.view'))
  -- Koordinator: o'quv jarayoni (o'z sinflari doirasida — kod tomonda cheklanadi)
  OR (r.slug = 'coordinator' AND p.slug IN (
    'students.view', 'classes.view',
    'grades.view', 'grades.create', 'grades.update',
    'attendance.view', 'attendance.create', 'attendance.update',
    'homework.view', 'homework.create', 'homework.update',
    'behavior.view', 'behavior.create', 'behavior.update'
  ))
  -- Ustoz
  OR (r.slug = 'teacher' AND p.slug IN (
    'students.view', 'classes.view',
    'grades.view', 'grades.create', 'grades.update',
    'attendance.view', 'attendance.create',
    'homework.view', 'homework.create', 'homework.update',
    'behavior.view', 'behavior.create'
  ))
  -- Kurator
  OR (r.slug = 'curator' AND p.slug IN (
    'students.view', 'classes.view',
    'grades.view',
    'attendance.view', 'attendance.create',
    'homework.view',
    'behavior.view', 'behavior.create'
  ))
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3) Shartnomasi bekor qilingan/to'xtagan o'quvchilar — "Nofaol"
--    (faol shartnomasi: Faol, To'langan, Band, Vaqtincha band)
--    Shartnomasi umuman yo'q o'quvchilarga tegilmaydi.
-- ============================================================================
UPDATE "students" s
SET status = 'INACTIVE'
WHERE s.status = 'ACTIVE'
  AND EXISTS (SELECT 1 FROM "contracts" c WHERE c."studentId" = s.id)
  AND NOT EXISTS (
    SELECT 1 FROM "contracts" c
    WHERE c."studentId" = s.id
      AND c.status IN ('ACTIVE', 'COMPLETED', 'SUSPENDED', 'TEMP_SUSPENDED')
  );
