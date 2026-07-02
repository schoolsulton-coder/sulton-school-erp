# 🗃 Ma'lumotlar Bazasi — Sulton School ERP & LMS

**DBMS:** PostgreSQL 16 · **ORM:** Prisma
**Kanonik manba:** [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)

Bu hujjat sxemaning o'qishga qulay tavsifidir. Har qanday o'zgarish avval
`schema.prisma` da qilinadi, so'ng migratsiya orqali bazaga qo'llanadi.

---

## 1. ERD — modullar bo'yicha guruhlar

```
┌──── AUTH & RBAC ──────────────────────────────────────────┐
│  Role ──< RolePermission >── Permission                    │
│   │                                                        │
│   └──< User >── (Employee | Student | Guardian profili)    │
└────────────────────────────────────────────────────────────┘

┌──── O'QUVCHI ─────────────────────────────────────────────┐
│  Student ──< StudentGuardian >── Guardian                  │
│     │  └──< StudentDocument                                │
│     └── Class                                              │
└────────────────────────────────────────────────────────────┘

┌──── CRM ──────────────────────────────────────────────────┐
│  LeadStage ──< Lead ──< LeadActivity                       │
│                  └── Student (konversiya)                  │
└────────────────────────────────────────────────────────────┘

┌──── SINF & DARS ──────────────────────────────────────────┐
│  Class ──< ClassTeacher >── User (ustoz/kurator)           │
│    │  ──< Schedule >── Subject                             │
│    └──< Student                                            │
└────────────────────────────────────────────────────────────┘

┌──── SHARTNOMA & MOLIYA ───────────────────────────────────┐
│  Contract ──< ContractInstallment                          │
│    │  ├── Discount                                         │
│    │  └──< Payment >── Student                             │
│  Account ──< Transaction >── FinanceCategory               │
└────────────────────────────────────────────────────────────┘

┌──── HR & OYLIK ───────────────────────────────────────────┐
│  Department ──< Position ──< Employee ── User              │
│                              │  ├── Salary                 │
│                              │  └──< EmployeeDocument       │
│  PayrollRun ──< PayrollItem >── Employee                   │
└────────────────────────────────────────────────────────────┘

┌──── LMS ──────────────────────────────────────────────────┐
│  Grade >── Student, Subject, User(teacher)                 │
│  Attendance >── Student, Class                             │
│  Homework ──< HomeworkSubmission >── Student               │
│  BehaviorRecord >── Student, User(author)                  │
└────────────────────────────────────────────────────────────┘

┌──── BILDIRISHNOMA & INTEGRATSIYA ─────────────────────────┐
│  Notification >── User                                     │
│  TelegramLink >── User                                     │
│  EsmaktabSyncLog                                           │
│  AuditLog >── User                                         │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Asosiy jadvallar (qisqacha)

| Jadval | Vazifa | Muhim maydonlar |
|--------|--------|-----------------|
| `users` | Barcha foydalanuvchilar | fullName, phone (unique), password, roleId, status |
| `roles` / `permissions` | RBAC | slug, group |
| `role_permissions` | Rol↔Ruxsat (M:N) | roleId, permissionId |
| `students` | O'quvchilar | firstName, lastName, classId, status, admissionDate |
| `guardians` | Vasiylar (ota-ona) | fullName, phone, relation |
| `student_guardians` | O'quvchi↔Vasiy (M:N) | isPrimary |
| `student_documents` | Hujjatlar | type, filePath |
| `lead_stages` / `leads` | CRM funnel | stageId, managerId, source, convertedAt |
| `lead_activities` | Qo'ng'iroq/eslatma | type, dueAt, doneAt |
| `classes` | Sinflar | name, gradeLevel, academicYear, capacity |
| `class_teachers` | Sinf↔Ustoz/Kurator | isCurator |
| `subjects` / `schedules` | Fanlar va jadval | weekday, startTime, endTime |
| `contracts` | Shartnomalar | number (unique), monthlyAmount, status, pdfPath |
| `contract_installments` | Oyma-oy jadval | dueDate, amount, paidAmount, status |
| `payments` | To'lovlar | amount, method, paidAt |
| `discounts` | Chegirmalar | type (PERCENT/FIXED), value |
| `accounts` | Kassalar | name, balance |
| `transactions` | Kirim/chiqim/o'tkazma | type, amount, categoryId |
| `finance_categories` | Moliya kategoriyalari | type |
| `departments`/`positions` | HR struktura | — |
| `employees` | Xodimlar | hireDate, status, positionId |
| `salaries` | Stavka | type (MONTHLY/HOURLY/PER_LESSON), baseRate |
| `payroll_runs`/`payroll_items` | Oylik hisob | period, base, bonus, penalty, total, status |
| `grades` | Baholar | value, type, period, comment |
| `attendances` | Davomat | date, status (unique: studentId+date) |
| `homeworks`/`homework_submissions` | Vazifa | dueDate, files, grade, status |
| `behavior_records` | Ahloqiy baho | type, points, description |
| `notifications` | Bildirishnoma | channel, status, sentAt |
| `telegram_links` | Telegram ulanishi | chatId (unique) |
| `esmaktab_sync_logs` | E-maktab loglari | entity, direction, status |
| `audit_logs` | Audit | action, entity, meta, ip |

---

## 3. Muhim cheklovlar va indekslar

- `users.phone`, `users.email` — **unique**
- `contracts.number` — **unique** (SHRT-2025-0001)
- `attendances` — **unique(studentId, date)** — bir kunda bitta belgi
- `homework_submissions` — **unique(homeworkId, studentId)**
- `payroll_items` — **unique(payrollRunId, employeeId)**
- `telegram_links.chatId` — **unique**
- Indekslar: tez-tez filtr qilinadigan ustunlarda (`classId`, `status`, `date`,
  `studentId`, `roleId`) — pagination tezligi uchun

---

## 4. Enum'lar

`UserStatus`, `Gender`, `StudentStatus`, `LeadActivityType`, `ContractStatus`,
`InstallmentStatus`, `DiscountType`, `TransactionType`, `SalaryType`,
`PayrollStatus`, `EmployeeStatus`, `GradeType`, `AttendanceStatus`,
`HomeworkSubmissionStatus`, `BehaviorType`, `NotificationChannel`,
`NotificationStatus` — to'liq qiymatlari `schema.prisma` da.

---

## 5. Migratsiya va seed

```bash
cd backend
npx prisma migrate dev --name init    # birinchi migratsiya
npx prisma db seed                    # rollar, ruxsatlar, admin user
npx prisma studio                     # bazani vizual ko'rish
```

**Seed boshlang'ich ma'lumot:** 7 rol, asosiy permission'lar, 1 admin
foydalanuvchi, namuna fanlar va lead bosqichlari (`prisma/seed.ts`).

---

## 6. Backup strategiyasi

```bash
# Kunlik (cron)
pg_dump -Fc sulton_school > backup_$(date +%F).dump
# Tiklash
pg_restore -d sulton_school backup_2026-06-25.dump
```
