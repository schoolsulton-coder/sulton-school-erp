-- "Vakansiya bo'yicha" bosqichi — oxirida (order 5).
-- Shartnoma tuzmaydigan leadlar shu yerga o'tkaziladi (vasiy/ism/telefon majburiy emas).
INSERT INTO "lead_stages" ("id", "name", "order", "color")
SELECT '447a4b80-7cb4-4469-90d3-ba2637a62bf1', 'Vakansiya bo''yicha', 5, '#6366f1'
WHERE NOT EXISTS (SELECT 1 FROM "lead_stages" WHERE "name" = 'Vakansiya bo''yicha');
