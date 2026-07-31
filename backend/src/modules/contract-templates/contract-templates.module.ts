import { Module } from '@nestjs/common';
import { ContractTemplatesService } from './contract-templates.service';
import { ContractTemplatesController } from './contract-templates.controller';

// PrismaService va PdfService global modullardan keladi.
@Module({
  controllers: [ContractTemplatesController],
  providers: [ContractTemplatesService],
})
export class ContractTemplatesModule {}
