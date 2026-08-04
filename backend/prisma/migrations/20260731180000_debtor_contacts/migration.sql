-- Qarzdor bilan aloqa jurnali
CREATE TABLE "debtor_contacts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debtor_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "debtor_contacts_studentId_createdAt_idx" ON "debtor_contacts"("studentId", "createdAt");

ALTER TABLE "debtor_contacts" ADD CONSTRAINT "debtor_contacts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "debtor_contacts" ADD CONSTRAINT "debtor_contacts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
