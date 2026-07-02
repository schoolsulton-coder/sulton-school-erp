# Backend — Sulton School ERP & LMS (NestJS)

## Ishga tushirish

```bash
cp .env.example .env          # qiymatlarni to'ldiring
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed           # rollar, ruxsatlar, admin
npm run start:dev             # http://localhost:4000/api
```

- API hujjatlari (Swagger): `http://localhost:4000/api/docs`
- Default admin: `.env` dagi `ADMIN_PHONE` / `ADMIN_PASSWORD`

## Yangi modul qo'shish

`src/modules/students/` — namuna modul. Nusxalang va o'zgartiring:

1. `nest g resource modules/<nom>` yoki qo'lda: `dto/`, `*.service.ts`,
   `*.controller.ts`, `*.module.ts`
2. Controller'ga `@UseGuards(JwtAuthGuard, PermissionsGuard)` va
   `@Permissions('<group>.<action>')` qo'shing
3. `src/app.module.ts` → `imports` ga modulni qo'shing
4. Yangi ruxsat kerak bo'lsa — `prisma/seed.ts` dagi `PERMISSION_GROUPS` ga qo'shing

## Tuzilish

```
src/
├── main.ts            # bootstrap, CORS, Swagger, ValidationPipe
├── app.module.ts      # modullarni yig'adi
├── prisma/            # PrismaService (global)
├── common/
│   ├── guards/        # JwtAuthGuard, PermissionsGuard
│   └── decorators/    # @Permissions, @CurrentUser
└── modules/
    ├── auth/          # login, JWT, /me
    └── students/      # NAMUNA modul (CRUD + RBAC)
```
