# Frontend — Sulton School ERP & LMS (Next.js)

## Ishga tushirish

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

Backend `http://localhost:4000/api` da ishlab turishi kerak.

## Tuzilish

```
app/
├── layout.tsx          # root + PWA meta
├── providers.tsx       # react-query provider
├── page.tsx            # landing
├── (auth)/login/       # kirish
└── (dashboard)/...      # rolga qarab kabinetlar (qo'shiladi)
lib/api.ts              # axios + JWT interceptor
store/auth.ts           # zustand (token, user, can())
public/manifest.json    # PWA
```

## Ruxsatga qarab UI

```tsx
const can = useAuthStore((s) => s.can);
{can('students.create') && <button>Yangi o'quvchi</button>}
```

## PWA ikonkalar

`public/icons/icon-192.png` va `icon-512.png` qo'shing (logotip asosida).
Production'da service worker uchun `next-pwa` yoki `@serwist/next` qo'shiladi.
