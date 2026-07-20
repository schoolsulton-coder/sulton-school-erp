-- CreateTable
CREATE TABLE "subject_norms" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "weeklyHours" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "subject_norms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_norms_classId_subjectId_key" ON "subject_norms"("classId", "subjectId");

-- AddForeignKey
ALTER TABLE "subject_norms" ADD CONSTRAINT "subject_norms_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_norms" ADD CONSTRAINT "subject_norms_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
