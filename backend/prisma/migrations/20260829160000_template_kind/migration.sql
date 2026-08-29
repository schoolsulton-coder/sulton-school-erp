-- Shablon turi: STUDENT = o'quvchi shartnomasi, HR = kadrlar hujjati (buyruq / mehnat shartnomasi)
ALTER TABLE "contract_templates" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'STUDENT';

-- CreateIndex
CREATE INDEX "contract_templates_kind_idx" ON "contract_templates"("kind");
