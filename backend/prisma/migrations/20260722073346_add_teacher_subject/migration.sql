-- AlterTable
ALTER TABLE "users" ADD COLUMN     "subjectId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
